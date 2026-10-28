package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
	"ytbs-platform/internal/models"

	"github.com/google/uuid"
)

type LogRepository struct {
	db *sql.DB
}

func NewLogRepository(db *sql.DB) *LogRepository {
	return &LogRepository{db: db}
}

type FilterParams struct {
	StartDate   string
	EndDate     string
	CompanyID   *uuid.UUID
	PlantID     *uuid.UUID
	Status      string
	Type        string
	Limit       int
	Offset      int
}

func (r *LogRepository) GetLogs(ctx context.Context, f FilterParams) ([]models.TransmissionLog, error) {
	query := `
		SELECT l.id, l.plant_id, p.plant_name, l.company_id, c.name as company_name,
		       c.license_no, p.ytbs_plant_id, l.transmission_type,
		       TO_CHAR(l.reading_date, 'YYYY-MM-DD') as reading_date, l.reading_time,
		       l.value, l.status, l.retry_count, l.ytbs_response_code,
		       COALESCE(l.ytbs_response_body, '') as ytbs_response_body,
		       COALESCE(l.error_message, '') as error_message,
		       l.is_manual_entry, l.sent_at, l.created_at
		FROM ytbs_transmission_logs l
		JOIN plants p ON l.plant_id = p.id
		JOIN companies c ON l.company_id = c.id
		WHERE 1=1
	`
	var args []interface{}
	idx := 1

	if f.StartDate != "" {
		query += fmt.Sprintf(" AND l.reading_date >= $%d", idx)
		args = append(args, f.StartDate)
		idx++
	}
	if f.EndDate != "" {
		query += fmt.Sprintf(" AND l.reading_date <= $%d", idx)
		args = append(args, f.EndDate)
		idx++
	}
	if f.CompanyID != nil {
		query += fmt.Sprintf(" AND l.company_id = $%d", idx)
		args = append(args, *f.CompanyID)
		idx++
	}
	if f.PlantID != nil {
		query += fmt.Sprintf(" AND l.plant_id = $%d", idx)
		args = append(args, *f.PlantID)
		idx++
	}
	if f.Status != "" && f.Status != "ALL" {
		query += fmt.Sprintf(" AND l.status = $%d", idx)
		args = append(args, strings.ToUpper(f.Status))
		idx++
	}
	if f.Type != "" && f.Type != "ALL" {
		query += fmt.Sprintf(" AND l.transmission_type = $%d", idx)
		args = append(args, strings.ToUpper(f.Type))
		idx++
	}

	query += " ORDER BY l.reading_date DESC, l.reading_time DESC"

	if f.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", idx)
		args = append(args, f.Limit)
		idx++
	} else {
		query += " LIMIT 200"
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.TransmissionLog
	for rows.Next() {
		var l models.TransmissionLog
		if err := rows.Scan(
			&l.ID, &l.PlantID, &l.PlantName, &l.CompanyID, &l.CompanyName,
			&l.LicenseNo, &l.YTBSPlantID, &l.TransmissionType,
			&l.ReadingDate, &l.ReadingTime, &l.Value, &l.Status,
			&l.RetryCount, &l.YTBSResponseCode, &l.YTBSResponseBody,
			&l.ErrorMessage, &l.IsManualEntry, &l.SentAt, &l.CreatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *LogRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.TransmissionLog, error) {
	query := `
		SELECT l.id, l.plant_id, p.plant_name, l.company_id, c.name as company_name,
		       c.license_no, p.ytbs_plant_id, l.transmission_type,
		       TO_CHAR(l.reading_date, 'YYYY-MM-DD') as reading_date, l.reading_time,
		       l.value, l.status, l.retry_count, l.ytbs_response_code,
		       COALESCE(l.ytbs_response_body, '') as ytbs_response_body,
		       COALESCE(l.error_message, '') as error_message,
		       l.is_manual_entry, l.sent_at, l.created_at
		FROM ytbs_transmission_logs l
		JOIN plants p ON l.plant_id = p.id
		JOIN companies c ON l.company_id = c.id
		WHERE l.id = $1
	`
	var l models.TransmissionLog
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&l.ID, &l.PlantID, &l.PlantName, &l.CompanyID, &l.CompanyName,
		&l.LicenseNo, &l.YTBSPlantID, &l.TransmissionType,
		&l.ReadingDate, &l.ReadingTime, &l.Value, &l.Status,
		&l.RetryCount, &l.YTBSResponseCode, &l.YTBSResponseBody,
		&l.ErrorMessage, &l.IsManualEntry, &l.SentAt, &l.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// CreateInTx inserts a pending log within an ACID transaction.
func (r *LogRepository) CreateInTx(ctx context.Context, tx *sql.Tx, l *models.TransmissionLog) error {
	query := `
		INSERT INTO ytbs_transmission_logs (
			plant_id, company_id, transmission_type, reading_date, reading_time,
			value, status, retry_count, is_manual_entry, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		RETURNING id, created_at
	`
	return tx.QueryRowContext(ctx, query,
		l.PlantID, l.CompanyID, l.TransmissionType, l.ReadingDate, l.ReadingTime,
		l.Value, l.Status, l.RetryCount, l.IsManualEntry,
	).Scan(&l.ID, &l.CreatedAt)
}

func (r *LogRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, responseCode int, responseBody, errMsg string) error {
	var sentAt *time.Time
	if status == "SUCCESS" {
		now := time.Now()
		sentAt = &now
	}

	query := `
		UPDATE ytbs_transmission_logs
		SET status = $1, ytbs_response_code = $2, ytbs_response_body = $3,
		    error_message = $4, sent_at = $5,
		    retry_count = CASE WHEN $1 = 'FAILED' THEN retry_count + 1 ELSE retry_count END
		WHERE id = $6
	`
	_, err := r.db.ExecContext(ctx, query, status, responseCode, responseBody, errMsg, sentAt, id)
	return err
}

func (r *LogRepository) ManualUpdateAndRetry(ctx context.Context, id uuid.UUID, newValue float64) error {
	query := `
		UPDATE ytbs_transmission_logs
		SET value = $1, status = 'PENDING', is_manual_entry = true, error_message = ''
		WHERE id = $2
	`
	_, err := r.db.ExecContext(ctx, query, newValue, id)
	return err
}

func (r *LogRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM ytbs_transmission_logs WHERE id = $1", id)
	return err
}

func (r *LogRepository) GetDashboardStats(ctx context.Context, companyID *uuid.UUID) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	if companyID != nil {
		stats.TotalCompanies = 1
		_ = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM plants WHERE is_active = true AND company_id = $1", *companyID).Scan(&stats.TotalPlants)

		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM ytbs_transmission_logs 
			WHERE reading_date = CURRENT_DATE AND company_id = $1
		`, *companyID).Scan(&stats.TodayTransmissions)

		var successCount int
		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM ytbs_transmission_logs 
			WHERE reading_date = CURRENT_DATE AND status = 'SUCCESS' AND company_id = $1
		`, *companyID).Scan(&successCount)

		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM ytbs_transmission_logs 
			WHERE reading_date = CURRENT_DATE AND status = 'FAILED' AND company_id = $1
		`, *companyID).Scan(&stats.FailedCount)

		_ = r.db.QueryRowContext(ctx, `
			SELECT COUNT(*) FROM ytbs_transmission_logs 
			WHERE reading_date = CURRENT_DATE AND status = 'PENDING' AND company_id = $1
		`, *companyID).Scan(&stats.PendingCount)

		if stats.TodayTransmissions > 0 {
			stats.SuccessRate = float64(successCount) / float64(stats.TodayTransmissions) * 100.0
		} else {
			stats.SuccessRate = 100.0
		}

		var lastSent sql.NullTime
		_ = r.db.QueryRowContext(ctx, `
			SELECT MAX(sent_at) FROM ytbs_transmission_logs WHERE status = 'SUCCESS' AND company_id = $1
		`, *companyID).Scan(&lastSent)

		if lastSent.Valid {
			stats.LastTransmissionAt = lastSent.Time.Format("15:04:05 02.01.2006")
		} else {
			stats.LastTransmissionAt = "Henüz gönderim yok"
		}
		return stats, nil
	}

	_ = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM companies WHERE is_active = true").Scan(&stats.TotalCompanies)
	_ = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM plants WHERE is_active = true").Scan(&stats.TotalPlants)

	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM ytbs_transmission_logs 
		WHERE reading_date = CURRENT_DATE
	`).Scan(&stats.TodayTransmissions)

	var successCount int
	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM ytbs_transmission_logs 
		WHERE reading_date = CURRENT_DATE AND status = 'SUCCESS'
	`).Scan(&successCount)

	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM ytbs_transmission_logs 
		WHERE reading_date = CURRENT_DATE AND status = 'FAILED'
	`).Scan(&stats.FailedCount)

	_ = r.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM ytbs_transmission_logs 
		WHERE reading_date = CURRENT_DATE AND status = 'PENDING'
	`).Scan(&stats.PendingCount)

	if stats.TodayTransmissions > 0 {
		stats.SuccessRate = float64(successCount) / float64(stats.TodayTransmissions) * 100.0
	} else {
		stats.SuccessRate = 100.0
	}

	var lastSent sql.NullTime
	_ = r.db.QueryRowContext(ctx, `
		SELECT MAX(sent_at) FROM ytbs_transmission_logs WHERE status = 'SUCCESS'
	`).Scan(&lastSent)

	if lastSent.Valid {
		stats.LastTransmissionAt = lastSent.Time.Format("15:04:05 02.01.2006")
	} else {
		stats.LastTransmissionAt = "Henüz gönderim yok"
	}

	return stats, nil
}
