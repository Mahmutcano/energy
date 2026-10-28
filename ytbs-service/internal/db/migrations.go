package db

import (
	"database/sql"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

func RunMigrations(db *sql.DB) error {
	queries := []string{
		`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,

		`CREATE TABLE IF NOT EXISTS companies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			tax_number VARCHAR(50) DEFAULT '',
			tax_office VARCHAR(100) DEFAULT '',
			contact_person VARCHAR(100) DEFAULT '',
			email VARCHAR(150) DEFAULT '',
			phone VARCHAR(50) DEFAULT '',
			ytbs_username VARCHAR(100) DEFAULT '',
			ytbs_password VARCHAR(100) DEFAULT '',
			ytbs_api_key VARCHAR(255) DEFAULT '',
			license_no VARCHAR(100) DEFAULT '',
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
			username VARCHAR(100) UNIQUE NOT NULL,
			full_name VARCHAR(150) NOT NULL,
			email VARCHAR(150) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role VARCHAR(50) DEFAULT 'company_user',
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS plants (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
			plant_name VARCHAR(255) NOT NULL,
			plant_type VARCHAR(50) DEFAULT 'GES',
			capacity_mw NUMERIC(10, 4) DEFAULT 0.0,
			ytbs_plant_id INT NOT NULL,
			can_send_ytbs BOOLEAN DEFAULT TRUE,
			period_type VARCHAR(20) DEFAULT '15m',
			city VARCHAR(100) DEFAULT '',
			district VARCHAR(100) DEFAULT '',
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS data_definitions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
			parameter_name VARCHAR(100) NOT NULL,
			data_type VARCHAR(50) NOT NULL,
			unit VARCHAR(20) DEFAULT 'MW',
			source_tag_or_column VARCHAR(255) DEFAULT '',
			multiplier NUMERIC(10, 4) DEFAULT 1.0,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS ytbs_transmission_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
			company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
			transmission_type VARCHAR(20) NOT NULL,
			reading_date DATE NOT NULL,
			reading_time VARCHAR(10) NOT NULL,
			value NUMERIC(14, 4) NOT NULL,
			status VARCHAR(30) DEFAULT 'PENDING',
			retry_count INT DEFAULT 0,
			ytbs_response_code INT DEFAULT 0,
			ytbs_response_body TEXT DEFAULT '',
			error_message TEXT DEFAULT '',
			is_manual_entry BOOLEAN DEFAULT FALSE,
			sent_at TIMESTAMP WITH TIME ZONE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		`CREATE INDEX IF NOT EXISTS idx_logs_date_plant ON ytbs_transmission_logs(reading_date, plant_id, status);`,
		`CREATE INDEX IF NOT EXISTS idx_logs_company ON ytbs_transmission_logs(company_id, created_at DESC);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("migration query failed: %w (SQL: %s)", err, query)
		}
	}

	log.Println("[DB] Migrations applied successfully")
	return seedDefaultData(db)
}

func seedDefaultData(db *sql.DB) error {
	// 1. Check if admin user exists
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		return err
	}

	if count == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("Adminpass123!"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		// Seed Super Admin
		_, err = db.Exec(`
			INSERT INTO users (username, full_name, email, password_hash, role, is_active)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, "admin", "Sistem Yöneticisi", "ozgancan9@gmail.com", string(hash), "super_admin", true)
		if err != nil {
			return fmt.Errorf("failed to seed admin user: %w", err)
		}
		log.Println("[DB] Default admin user created (Username: admin, Pass: Adminpass123!)")

		// Seed a default demo company and plant
		var companyID string
		err = db.QueryRow(`
			INSERT INTO companies (name, tax_number, tax_office, contact_person, email, phone, ytbs_username, ytbs_password, ytbs_api_key, license_no, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id
		`, "Anadolu Yenilenebilir Enerji A.Ş.", "1234567890", "Kordon VD", "Ahmet Yılmaz", "info@anadoluenerji.com.tr", "+90 532 100 2030", "ytbs_anadolu", "YtbsSecret2026!", "sample-teias-api-key-99812", "LNS-2024-98123", true).Scan(&companyID)
		if err != nil {
			return fmt.Errorf("failed to seed demo company: %w", err)
		}

		var plantID string
		err = db.QueryRow(`
			INSERT INTO plants (company_id, plant_name, plant_type, capacity_mw, ytbs_plant_id, can_send_ytbs, period_type, city, district, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id
		`, companyID, "Konya Karapınar GES-1", "GES", 15.5000, 48291, true, "15m", "Konya", "Karapınar", true).Scan(&plantID)
		if err != nil {
			return fmt.Errorf("failed to seed demo plant: %w", err)
		}

		// Seed data definition
		_, _ = db.Exec(`
			INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
			VALUES 
			($1, 'Aktif Güç', 'INSTANT_MW', 'MW', 'scada_telemetry.active_power_kw', 0.001, true),
			($1, 'Saatlik Net Üretim', 'HOURLY_MWH', 'MWh', 'meter_hourly.net_mwh', 1.0, true)
		`, plantID)

		// Seed a demo transmission log
		_, _ = db.Exec(`
			INSERT INTO ytbs_transmission_logs 
			(plant_id, company_id, transmission_type, reading_date, reading_time, value, status, ytbs_response_code, is_manual_entry, sent_at)
			VALUES 
			($1, $2, 'INSTANT', CURRENT_DATE, '16:45', 14.82, 'SUCCESS', 200, false, NOW()),
			($1, $2, 'INSTANT', CURRENT_DATE, '17:00', 15.10, 'SUCCESS', 200, false, NOW())
		`, plantID, companyID)

		log.Println("[DB] Sample demo data seeded successfully")
	}

	return nil
}
