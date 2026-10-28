package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port          string
	DatabaseURL   string
	SourceDBURL   string // External SCADA / Railway telemetry DB
	SessionSecret string

	// SMTP Configuration for Alerts
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
	AlertEmail   string // ozgancan9@gmail.com

	// Worker Configuration
	WorkerEnabled bool
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/ytbs_db?sslmode=disable")
	sessionSecret := getEnv("SESSION_SECRET", "super-secret-ytbs-key-32bytes-long!")

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	return &Config{
		Port:          port,
		DatabaseURL:   dbURL,
		SourceDBURL:   getEnv("SOURCE_DATABASE_URL", "postgresql://postgres:SDDyuSvBSUVpZTFLoLunxKSevXAnLHrD@mainline.proxy.rlwy.net:21430/railway"),
		SessionSecret: sessionSecret,

		SMTPHost:      getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:      smtpPort,
		SMTPUsername:  getEnv("SMTP_USERNAME", ""),
		SMTPPassword:  getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:      getEnv("SMTP_FROM", "ytbs-alert@energy-platform.com"),
		AlertEmail:    getEnv("ALERT_EMAIL", "ozgancan9@gmail.com"),

		WorkerEnabled: getEnv("WORKER_ENABLED", "true") == "true",
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
