package repository

import (
	"context"
	"database/sql"
	"ytbs-platform/internal/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) GetAll(ctx context.Context) ([]models.User, error) {
	query := `
		SELECT u.id, u.company_id, COALESCE(c.name, 'Tüm Sistem (Super Admin)') as company_name,
		       u.username, u.full_name, u.email, u.role, u.is_active, u.created_at
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		ORDER BY u.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(
			&u.ID, &u.CompanyID, &u.CompanyName,
			&u.Username, &u.FullName, &u.Email,
			&u.Role, &u.IsActive, &u.CreatedAt,
		); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	query := `
		SELECT u.id, u.company_id, COALESCE(c.name, '') as company_name,
		       u.username, u.full_name, u.email, u.password_hash, u.role, u.is_active, u.created_at
		FROM users u
		LEFT JOIN companies c ON u.company_id = c.id
		WHERE u.username = $1 AND u.is_active = true
	`
	var u models.User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&u.ID, &u.CompanyID, &u.CompanyName,
		&u.Username, &u.FullName, &u.Email, &u.PasswordHash,
		&u.Role, &u.IsActive, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Create(ctx context.Context, u *models.User, rawPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(rawPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hash)

	query := `
		INSERT INTO users (company_id, username, full_name, email, password_hash, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.db.QueryRowContext(ctx, query,
		u.CompanyID, u.Username, u.FullName, u.Email, u.PasswordHash, u.Role, u.IsActive,
	).Scan(&u.ID, &u.CreatedAt)
}

func (r *UserRepository) Update(ctx context.Context, u *models.User, newPassword *string) error {
	if newPassword != nil && *newPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(*newPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		query := `
			UPDATE users
			SET company_id = $1, username = $2, full_name = $3, email = $4,
			    password_hash = $5, role = $6, is_active = $7
			WHERE id = $8
		`
		_, err = r.db.ExecContext(ctx, query,
			u.CompanyID, u.Username, u.FullName, u.Email, string(hash), u.Role, u.IsActive, u.ID,
		)
		return err
	}

	query := `
		UPDATE users
		SET company_id = $1, username = $2, full_name = $3, email = $4,
		    role = $5, is_active = $6
		WHERE id = $7
	`
	_, err := r.db.ExecContext(ctx, query,
		u.CompanyID, u.Username, u.FullName, u.Email, u.Role, u.IsActive, u.ID,
	)
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
	return err
}
