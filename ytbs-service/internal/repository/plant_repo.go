package repository

import (
	"context"
	"database/sql"
	"ytbs-platform/internal/models"

	"github.com/google/uuid"
)

type PlantRepository struct {
	db *sql.DB
}

func NewPlantRepository(db *sql.DB) *PlantRepository {
	return &PlantRepository{db: db}
}

func (r *PlantRepository) GetAll(ctx context.Context, companyID *uuid.UUID) ([]models.Plant, error) {
	query := `
		SELECT p.id, p.company_id, c.name as company_name, p.plant_name, p.plant_type,
		       p.capacity_mw, p.ytbs_plant_id, p.can_send_ytbs, p.period_type,
		       p.city, p.district, p.is_active, p.created_at
		FROM plants p
		JOIN companies c ON p.company_id = c.id
	`
	var rows *sql.Rows
	var err error

	if companyID != nil {
		query += " WHERE p.company_id = $1 ORDER BY p.created_at DESC"
		rows, err = r.db.QueryContext(ctx, query, *companyID)
	} else {
		query += " ORDER BY p.created_at DESC"
		rows, err = r.db.QueryContext(ctx, query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		var p models.Plant
		if err := rows.Scan(
			&p.ID, &p.CompanyID, &p.CompanyName, &p.PlantName, &p.PlantType,
			&p.CapacityMW, &p.YTBSPlantID, &p.CanSendYTBS, &p.PeriodType,
			&p.City, &p.District, &p.IsActive, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		plants = append(plants, p)
	}
	return plants, nil
}

func (r *PlantRepository) GetActiveForSending(ctx context.Context) ([]models.Plant, error) {
	query := `
		SELECT p.id, p.company_id, c.name as company_name, p.plant_name, p.plant_type,
		       p.capacity_mw, p.ytbs_plant_id, p.can_send_ytbs, p.period_type,
		       p.city, p.district, p.is_active, p.created_at
		FROM plants p
		JOIN companies c ON p.company_id = c.id
		WHERE p.is_active = true AND p.can_send_ytbs = true AND c.is_active = true
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		var p models.Plant
		if err := rows.Scan(
			&p.ID, &p.CompanyID, &p.CompanyName, &p.PlantName, &p.PlantType,
			&p.CapacityMW, &p.YTBSPlantID, &p.CanSendYTBS, &p.PeriodType,
			&p.City, &p.District, &p.IsActive, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		plants = append(plants, p)
	}
	return plants, nil
}

func (r *PlantRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Plant, error) {
	query := `
		SELECT p.id, p.company_id, c.name as company_name, p.plant_name, p.plant_type,
		       p.capacity_mw, p.ytbs_plant_id, p.can_send_ytbs, p.period_type,
		       p.city, p.district, p.is_active, p.created_at
		FROM plants p
		JOIN companies c ON p.company_id = c.id
		WHERE p.id = $1
	`
	var p models.Plant
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&p.ID, &p.CompanyID, &p.CompanyName, &p.PlantName, &p.PlantType,
		&p.CapacityMW, &p.YTBSPlantID, &p.CanSendYTBS, &p.PeriodType,
		&p.City, &p.District, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PlantRepository) Create(ctx context.Context, p *models.Plant) error {
	query := `
		INSERT INTO plants (company_id, plant_name, plant_type, capacity_mw, ytbs_plant_id, can_send_ytbs, period_type, city, district, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		p.CompanyID, p.PlantName, p.PlantType, p.CapacityMW, p.YTBSPlantID,
		p.CanSendYTBS, p.PeriodType, p.City, p.District, p.IsActive,
	).Scan(&p.ID, &p.CreatedAt)
}

func (r *PlantRepository) Update(ctx context.Context, p *models.Plant) error {
	query := `
		UPDATE plants
		SET company_id = $1, plant_name = $2, plant_type = $3, capacity_mw = $4,
		    ytbs_plant_id = $5, can_send_ytbs = $6, period_type = $7,
		    city = $8, district = $9, is_active = $10
		WHERE id = $11
	`
	_, err := r.db.ExecContext(ctx, query,
		p.CompanyID, p.PlantName, p.PlantType, p.CapacityMW,
		p.YTBSPlantID, p.CanSendYTBS, p.PeriodType,
		p.City, p.District, p.IsActive, p.ID,
	)
	return err
}

func (r *PlantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM plants WHERE id = $1", id)
	return err
}
