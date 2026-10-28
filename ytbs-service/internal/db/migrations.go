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

	// Remove legacy bracket-prefixed parameters
	_, _ = db.Exec("DELETE FROM data_definitions WHERE parameter_name LIKE '[%'")

	type PointDef struct {
		ParamName  string
		SourceTag  string
		DataType   string
		Unit       string
		Multiplier float64
	}

	points := []PointDef{
		// 1. TEİAŞ YTBS Zorunlu Telemetri Parametreleri
		{"Aktif Güç (15 Dk Anlık)", "Active Power (P)", "INSTANT_MW", "MW", 0.001},
		{"Net Üretilen Enerji (1 Saatlik)", "Supplied Active Energy (Wpneg)", "HOURLY_MWH", "MWh", 0.001},

		// 2. SCADA Telemetri & Ölçüm Noktaları (Cihaz parantezleri kaldırıldı)
		{"Faz Gerilimi L1 (Van)", "Voltage L1 (Van)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Faz Gerilimi L2 (VBN)", "Voltage L2 (VBN)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Faz Gerilimi L3 (VCN)", "Voltage L3 (VCN)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Hat Gerilimi L1-L2 (VAB)", "Voltage L1-L2 (VAB)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Hat Gerilimi L2-L3 (VBC)", "Voltage L2-L3 (VBC)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Hat Gerilimi L3-L1 (VCA)", "Voltage L3-L1 (VCA)", "PHASE_VOLTAGE", "kV", 1.0},
		{"Gerilim THD L1 (Harmonik)", "Voltage THD L1 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Gerilim THD L2 (Harmonik)", "Voltage THD L2 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Gerilim THD L3 (Harmonik)", "Voltage THD L3 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Gerilim THD L1-L2", "Voltage THD L1 – L2 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Gerilim THD L2-L3", "Voltage THD L2 – L3 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Gerilim THD L3-L1", "Voltage THD L3 – L1 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Faz Akımı L1 (IA)", "Current L1 (IA)", "PHASE_CURRENT", "A", 1.0},
		{"Faz Akımı L2 (IB)", "Current L2 (IB)", "PHASE_CURRENT", "A", 1.0},
		{"Faz Akımı L3 (IC)", "Current L3 (IC)", "PHASE_CURRENT", "A", 1.0},
		{"Akım THD L1 (Harmonik)", "Current THD L1 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Akım THD L2 (Harmonik)", "Current THD L2 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Akım THD L3 (Harmonik)", "Current THD L3 (Harmonic)", "HARMONIC", "%", 1.0},
		{"Güç Faktörü (PF)", "Power factor L1..L4 (PF)", "POWER_FACTOR", "PF", 1.0},
		{"Şebeke Frekansı (Hz)", "Frequency", "FREQUENCY", "Hz", 1.0},
		{"Görünür Güç (S)", "Apparent Power (S)", "APPARENT_POWER", "kVA", 1.0},
		{"Reaktif Güç - Tüketim (Q)", "Reactive Power (Q) - CONSUMPTION", "REACTIVE_POWER", "kVAR", 1.0},
		{"Reaktif Güç - Dağıtım (Q)", "Reactive Power (Q) - DISTRIBUTION", "REACTIVE_POWER", "kVAR", 1.0},
		{"Tüketilen Aktif Enerji (Wppos)", "Consumed Active Energy (Wppos)", "TOTAL_INDEX", "kWh", 1.0},
		{"İnvertör AC Akım", "AC Current", "PHASE_CURRENT", "A", 1.0},
		{"İnvertör Faz A Akımı", "Phase A Current", "PHASE_CURRENT", "A", 1.0},
		{"İnvertör Faz B Akımı", "Phase B Current", "PHASE_CURRENT", "A", 1.0},
		{"İnvertör Faz C Akımı", "Phase C Current", "PHASE_CURRENT", "A", 1.0},
		{"İnvertör Faz Gerilimi AB", "Phase Voltage AB", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör Faz Gerilimi BC", "Phase Voltage BC", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör Faz Gerilimi CA", "Phase Voltage CA", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör Faz Gerilimi AN", "Phase Voltage AN", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör Faz Gerilimi BN", "Phase Voltage BN", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör Faz Gerilimi CN", "Phase Voltage CN", "PHASE_VOLTAGE", "V", 1.0},
		{"İnvertör AC Güç", "AC Power", "ACTIVE_POWER", "kW", 0.001},
		{"İnvertör Hat Frekansı", "Line Frequency", "FREQUENCY", "Hz", 1.0},
		{"İnvertör AC Görünür Güç", "AC Apparent Power", "APPARENT_POWER", "kVA", 1.0},
		{"İnvertör AC Reaktif Güç", "AC Reactive Power", "REACTIVE_POWER", "kVAR", 1.0},
		{"İnvertör AC Güç Faktörü", "AC Power Factor", "POWER_FACTOR", "PF", 1.0},
		{"İnvertör AC Enerji", "AC Energy", "HOURLY_MWH", "kWh", 0.001},
		{"İnvertör DC Akım", "DC Current", "ANALOG", "A", 1.0},
		{"İnvertör DC Gerilim", "DC Voltage", "ANALOG", "V", 1.0},
		{"İnvertör DC Güç", "DC Power", "ANALOG", "kW", 1.0},
		{"İnvertör Kabin Sıcaklığı", "Cabinet Temperature", "ANALOG", "°C", 1.0},
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
		_, err := stmt.Exec(plantID, pt.ParamName, pt.DataType, pt.Unit, pt.SourceTag, pt.Multiplier)
		if err != nil {
			log.Printf("[DB] Warning: failed to seed point %s: %v", pt.ParamName, err)
		}
	}

	log.Printf("[DB] %d SCADA telemetri veri tanımı yerel veritabanına aktarıldı ve eşitlendi", len(points))
	return nil
}
