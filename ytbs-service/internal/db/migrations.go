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

		// 6. System Connection Logs (SCADA & External DB Connection health history)
		`CREATE TABLE IF NOT EXISTS system_connection_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			source_name VARCHAR(100) NOT NULL,
			connection_status VARCHAR(30) NOT NULL,
			error_message TEXT DEFAULT '',
			checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_conn_logs_time ON system_connection_logs(checked_at DESC);`,

		// Unique constraint for idempotent data definitions
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_data_def_plant_param ON data_definitions(plant_id, parameter_name);`,

		// 7. Local SCADA Devices Table (EMK Analizör, İnvertörler)
		`CREATE TABLE IF NOT EXISTS scada_devices (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
			device_name VARCHAR(100) NOT NULL,
			device_type VARCHAR(50) NOT NULL,
			model VARCHAR(100) DEFAULT '',
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,

		// 8. Local SCADA Telemetry Values Table (Sunucu üzerindeki telemetri havuzu)
		`CREATE TABLE IF NOT EXISTS telemetry_values (
			id BIGSERIAL PRIMARY KEY,
			plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
			device_id UUID REFERENCES scada_devices(id) ON DELETE SET NULL,
			tag_name VARCHAR(100) NOT NULL,
			value_numeric DOUBLE PRECISION NOT NULL,
			quality SMALLINT DEFAULT 192,
			measurement_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);`,
		`CREATE INDEX IF NOT EXISTS idx_telemetry_tag_time ON telemetry_values(tag_name, measurement_time DESC);`,
		`CREATE INDEX IF NOT EXISTS idx_telemetry_plant_time ON telemetry_values(plant_id, measurement_time DESC);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("migration query failed: %w (SQL: %s)", err, query)
		}
	}

	log.Println("[DB] Migrations applied successfully")
	if err := seedDefaultData(db); err != nil {
		return err
	}
	return seedScadaDataDefinitions(db)
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

		// Seed Sistem Admin
		_, err = db.Exec(`
			INSERT INTO users (username, full_name, email, password_hash, role, is_active)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, "admin", "Sistem Yöneticisi", "ozgancan9@gmail.com", string(hash), "system_admin", true)
		if err != nil {
			return fmt.Errorf("failed to seed admin user: %w", err)
		}
		log.Println("[DB] Default admin user created (Username: admin, Pass: Adminpass123!)")

		// Seed Diyarbakır OSB Pilot Company
		var companyID string
		err = db.QueryRow(`
			INSERT INTO companies (name, tax_number, tax_office, contact_person, email, phone, ytbs_username, ytbs_password, ytbs_api_key, license_no, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id
		`, "DİYARBAKIR ORGANİZE SANAYİ BÖLGESİ", "2950553123", "Gökalp VD", "Diyarbakır OSB Enerji Birimi", "enerji@diyarbakirosb.org.tr", "+90 412 711 7000", "diyarbakir_osb", "YtbsPassword2026!", "b8c6a5a2-c3f9-4d6b-9e2a-7f6d5c4b3a21", "ED-OSB/1836-1/1305", true).Scan(&companyID)
		if err != nil {
			return fmt.Errorf("failed to seed pilot company: %w", err)
		}

		// Seed Santral Sahibi linked to Diyarbakır OSB
		ownerHash, _ := bcrypt.GenerateFromPassword([]byte("Santralpass123!"), bcrypt.DefaultCost)
		_, _ = db.Exec(`
			INSERT INTO users (company_id, username, full_name, email, password_hash, role, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, companyID, "santralsahibi", "Akmersan Santral Yöneticisi", "santral@akmersan.com.tr", string(ownerHash), "plant_owner", true)

		var plantID string
		err = db.QueryRow(`
			INSERT INTO plants (company_id, plant_name, plant_type, capacity_mw, ytbs_plant_id, can_send_ytbs, period_type, city, district, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id
		`, companyID, "Akmersan GES", "GES", 3.1250, 25924, true, "15m", "Diyarbakır", "Yenişehir (OSB)", true).Scan(&plantID)
		if err != nil {
			return fmt.Errorf("failed to seed pilot plant: %w", err)
		}

		// Seed data definition matching SCADA telemetry dataset
		_, _ = db.Exec(`
			INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
			VALUES 
			($1, 'Active Power (P)', 'INSTANT_MW', 'MW', 'Active Power (P)', 0.001, true),
			($1, 'Supplied Active Energy (Wpneg)', 'HOURLY_MWH', 'MWh', 'Supplied Active Energy (Wpneg)', 0.001, true)
		`, plantID)

		log.Println("[DB] Diyarbakır OSB & Akmersan GES pilot data seeded successfully (No mock transmission logs)")
	}

	return nil
}

// seedScadaDataDefinitions imports all 46 telemetry data points and devices into the server's local SCADA database
func seedScadaDataDefinitions(db *sql.DB) error {
	var plantID string
	err := db.QueryRow("SELECT id FROM plants WHERE ytbs_plant_id = 25924 OR plant_name ILIKE '%Akmersan%' ORDER BY created_at ASC LIMIT 1").Scan(&plantID)
	if err != nil {
		// If no pilot plant found yet, skip
		return nil
	}

	// 1. Seed SCADA Devices (EMK analyzer & Inverters)
	devices := []struct {
		Name  string
		Type  string
		Model string
	}{
		{"EMK", "ANALYZER", "ENTES EMK-01"},
		{"INV1", "INVERTER", "Kaco Blueplanet 60.0 TL3"},
		{"INV2", "INVERTER", "Kaco Blueplanet 60.0 TL3"},
		{"INV3", "INVERTER", "Kaco Blueplanet 60.0 TL3"},
		{"INV4", "INVERTER", "Kaco Blueplanet 60.0 TL3"},
	}

	for _, d := range devices {
		var devCount int
		_ = db.QueryRow("SELECT COUNT(*) FROM scada_devices WHERE plant_id = $1 AND device_name = $2", plantID, d.Name).Scan(&devCount)
		if devCount == 0 {
			_, _ = db.Exec(`
				INSERT INTO scada_devices (plant_id, device_name, device_type, model, is_active)
				VALUES ($1, $2, $3, $4, true)
			`, plantID, d.Name, d.Type, d.Model)
		}
	}

	type PointDef struct {
		Profile    string
		DataName   string
		Address    string
		DataType   string
		Unit       string
		Multiplier float64
	}

	points := []PointDef{
		// ENTES EMK-01 (26 points)
		{"ENTES EMK-01", "Voltage L1 (Van)", "40001", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage L2 (VBN)", "40003", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage L3 (VCN)", "40005", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage L1-L2 (VAB)", "40009", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage L2-L3 (VBC)", "40011", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage L3-L1 (VCA)", "40013", "PHASE_VOLTAGE", "kV", 1.0},
		{"ENTES EMK-01", "Voltage THD L1 (Harmonic)", "40017", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Voltage THD L2 (Harmonic)", "40019", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Voltage THD L3 (Harmonic)", "40021", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Voltage THD L1 – L2 (Harmonic)", "40025", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Voltage THD L2 – L3 (Harmonic)", "40027", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Voltage THD L3 – L1 (Harmonic)", "40029", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Current L1 (IA)", "40033", "PHASE_CURRENT", "A", 1.0},
		{"ENTES EMK-01", "Current L2 (IB)", "40035", "PHASE_CURRENT", "A", 1.0},
		{"ENTES EMK-01", "Current L3 (IC)", "40037", "PHASE_CURRENT", "A", 1.0},
		{"ENTES EMK-01", "Current THD L1 (Harmonic)", "40041", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Current THD L2 (Harmonic)", "40043", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Current THD L3 (Harmonic)", "40045", "HARMONIC", "%", 1.0},
		{"ENTES EMK-01", "Power factor L1..L4 (PF)", "40073", "POWER_FACTOR", "PF", 1.0},
		{"ENTES EMK-01", "Frequency", "40081", "FREQUENCY", "Hz", 1.0},
		{"ENTES EMK-01", "Active Power (P)", "40153", "INSTANT_MW", "MW", 0.001},
		{"ENTES EMK-01", "Apparent Power (S)", "40161", "APPARENT_POWER", "kVA", 1.0},
		{"ENTES EMK-01", "Reactive Power (Q) - CONSUMPTION", "40169", "REACTIVE_POWER", "kVAR", 1.0},
		{"ENTES EMK-01", "Reactive Power (Q) - DISTRIBUTION", "40177", "REACTIVE_POWER", "kVAR", 1.0},
		{"ENTES EMK-01", "Consumed Active Energy (Wppos)", "55024", "TOTAL_INDEX", "kWh", 1.0},
		{"ENTES EMK-01", "Supplied Active Energy (Wpneg)", "55030", "HOURLY_MWH", "MWh", 0.001},

		// Kaco Blueplanet 60.0 TL3 (20 points)
		{"Kaco Blueplanet 60.0 TL3", "AC Current", "40123", "PHASE_CURRENT", "A", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase A Current", "40125", "PHASE_CURRENT", "A", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase B Current", "40127", "PHASE_CURRENT", "A", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase C Current", "40129", "PHASE_CURRENT", "A", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage AB", "40132", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage BC", "40134", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage CA", "40136", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage AN", "40137", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage BN", "40139", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Phase Voltage CN", "40141", "PHASE_VOLTAGE", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "AC Power", "40143", "ACTIVE_POWER", "kW", 0.001},
		{"Kaco Blueplanet 60.0 TL3", "Line Frequency", "40145", "FREQUENCY", "Hz", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "AC Apparent Power", "40147", "APPARENT_POWER", "kVA", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "AC Reactive Power", "40149", "REACTIVE_POWER", "kVAR", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "AC Power Factor", "40151", "POWER_FACTOR", "PF", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "AC Energy", "40153", "HOURLY_MWH", "kWh", 0.001},
		{"Kaco Blueplanet 60.0 TL3", "DC Current", "40155", "ANALOG", "A", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "DC Voltage", "40157", "ANALOG", "V", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "DC Power", "40159", "ANALOG", "kW", 1.0},
		{"Kaco Blueplanet 60.0 TL3", "Cabinet Temperature", "40161", "ANALOG", "°C", 1.0},
	}

	stmt, err := db.Prepare(`
		INSERT INTO data_definitions (plant_id, parameter_name, data_type, unit, source_tag_or_column, multiplier, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, true)
		ON CONFLICT (plant_id, parameter_name) DO UPDATE 
		SET source_tag_or_column = EXCLUDED.source_tag_or_column,
		    unit = EXCLUDED.unit,
		    data_type = EXCLUDED.data_type,
		    multiplier = EXCLUDED.multiplier
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, pt := range points {
		paramFullName := fmt.Sprintf("[%s] %s", pt.Profile, pt.DataName)
		sourceTag := pt.DataName
		_, err := stmt.Exec(plantID, paramFullName, pt.DataType, pt.Unit, sourceTag, pt.Multiplier)
		if err != nil {
			log.Printf("[DB] Warning: failed to seed point %s: %v", paramFullName, err)
		}
	}

	log.Printf("[DB] %d SCADA telemetri veri tanımı yerel veritabanına aktarıldı ve eşitlendi", len(points))
	return nil
}
