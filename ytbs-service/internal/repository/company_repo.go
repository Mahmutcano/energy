package repository

import (
	"context"
	"database/sql"
	"ytbs-platform/internal/models"

	"github.com/google/uuid"
)

type CompanyRepository struct {
	db *sql.DB
}

func NewCompanyRepository(db *sql.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

func (r *CompanyRepository) GetAll(ctx context.Context) ([]models.Company, error) {
	query := `
		SELECT c.id, c.name, c.tax_number, c.tax_office, c.contact_person, c.email, c.phone,
		       c.ytbs_username, c.ytbs_password, c.ytbs_api_key, c.license_no, c.is_active, c.created_at,
		       COUNT(p.id) as plant_count
		FROM companies c
		LEFT JOIN plants p ON c.id = p.company_id
		GROUP BY c.id
		ORDER BY c.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []models.Company
	for rows.Next() {
		var c models.Company
		if err := rows.Scan(
			&c.ID, &c.Name, &c.TaxNumber, &c.TaxOffice, &c.ContactPerson, &c.Email, &c.Phone,
			&c.YTBSUsername, &c.YTBSPassword, &c.YTBSApiKey, &c.LicenseNo, &c.IsActive, &c.CreatedAt,
			&c.PlantCount,
		); err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}
	return companies, nil
}

func (r *CompanyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Company, error) {
	query := `
		SELECT id, name, tax_number, tax_office, contact_person, email, phone,
		       ytbs_username, ytbs_password, ytbs_api_key, license_no, is_active, created_at
		FROM companies
		WHERE id = $1
	`
	var c models.Company
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID, &c.Name, &c.TaxNumber, &c.TaxOffice, &c.ContactPerson, &c.Email, &c.Phone,
		&c.YTBSUsername, &c.YTBSPassword, &c.YTBSApiKey, &c.LicenseNo, &c.IsActive, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CompanyRepository) Create(ctx context.Context, c *models.Company) error {
	query := `
		INSERT INTO companies (name, tax_number, tax_office, contact_person, email, phone, ytbs_username, ytbs_password, ytbs_api_key, license_no, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		c.Name, c.TaxNumber, c.TaxOffice, c.ContactPerson, c.Email, c.Phone,
		c.YTBSUsername, c.YTBSPassword, c.YTBSApiKey, c.LicenseNo, c.IsActive,
	).Scan(&c.ID, &c.CreatedAt)
}

func (r *CompanyRepository) Update(ctx context.Context, c *models.Company) error {
	query := `
		UPDATE companies
		SET name = $1, tax_number = $2, tax_office = $3, contact_person = $4, email = $5,
		    phone = $6, ytbs_username = $7, ytbs_password = $8, ytbs_api_key = $9,
		    license_no = $10, is_active = $11
		WHERE id = $12
	`
	_, err := r.db.ExecContext(ctx, query,
		c.Name, c.TaxNumber, c.TaxOffice, c.ContactPerson, c.Email,
		c.Phone, c.YTBSUsername, c.YTBSPassword, c.YTBSApiKey,
		c.LicenseNo, c.IsActive, c.ID,
	)
	return err
}

func (r *CompanyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM companies WHERE id = $1", id)
	return err
}
