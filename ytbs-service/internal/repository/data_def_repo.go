package repository

import (
	"context"
	"database/sql"
	"ytbs-platform/internal/models"

	"github.com/google/uuid"
)

type DataDefRepository struct {
	db *sql.DB
}

func NewDataDefRepository(db *sql.DB) *DataDefRepository {
	return &DataDefRepository{db: db}
}

func (r *DataDefRepository) GetAll(ctx context.Context, plantID *uuid.UUID) ([]models.DataDefinition, error) {
	query := `
		SELECT d.id, d.plant_id, p.plant_name, d.parameter_name, d.data_type,
		       d.unit, d.source_tag_or_column, d.multiplier, d.is_active, d.created_at
		FROM data_definitions d
		JOIN plants p ON d.plant_id = p.id
	`
	var rows *sql.Rows
	var err error

	if plantID != nil {
		query += " WHERE d.plant_id = $1 ORDER BY d.created_at DESC"
		rows, err = r.db.QueryContext(ctx, query, *plantID)
	} else {
		query += " ORDER BY d.created_at DESC"
		rows, err = r.db.QueryContext(ctx, query)
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var defs []models.DataDefinition
	for rows.Next() {
		var d models.DataDefinition
		if err := rows.Scan(
			&d.ID, &d.PlantID, &d.PlantName, &d.ParameterName, &d.DataType,
			&d.Unit, &d.SourceTagOrColumn, &d.Multiplier, &d.IsActive, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		defs = append(defs, d)
	}
	return defs, nil
}

func (r *DataDefRepository) Create(ctx context.Context, d *models.DataDefinition) error {
	query := `
		INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		d.PlantID, d.ParameterName, d.DataType, d.Unit, d.SourceTagOrColumn, d.Multiplier, d.IsActive,
	).Scan(&d.ID, &d.CreatedAt)
}

func (r *DataDefRepository) Update(ctx context.Context, d *models.DataDefinition) error {
	query := `
		UPDATE data_definitions
		SET plant_id = $1, parameter_name = $2, data_type = $3, unit = $4,
		    source_tag_or_column = $5, multiplier = $6, is_active = $7
		WHERE id = $8
	`
	_, err := r.db.ExecContext(ctx, query,
		d.PlantID, d.ParameterName, d.DataType, d.Unit,
		d.SourceTagOrColumn, d.Multiplier, d.IsActive, d.ID,
	)
	return err
}

func (r *DataDefRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM data_definitions WHERE id = $1", id)
	return err
}

func (r *DataDefRepository) Clone(ctx context.Context, sourcePlantID, targetPlantID uuid.UUID) (int64, error) {
	query := `
		INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
		SELECT $1, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active
		FROM data_definitions
		WHERE plant_id = $2
	`
	res, err := r.db.ExecContext(ctx, query, targetPlantID, sourcePlantID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

func (r *DataDefRepository) BulkCreate(ctx context.Context, defs []models.DataDefinition) (int, error) {
	if len(defs) == 0 {
		return 0, nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	count := 0
	for _, d := range defs {
		_, err := stmt.ExecContext(ctx, d.PlantID, d.ParameterName, d.DataType, d.Unit, d.SourceTagOrColumn, d.Multiplier, d.IsActive)
		if err == nil {
			count++
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return count, nil
}
