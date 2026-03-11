package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool
var TimescalePool *pgxpool.Pool

func Connect() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL must be set")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return fmt.Errorf("unable to parse DATABASE_URL: %v", err)
	}

	// Performance tuning for pool
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %v", err)
	}

	// Verify connection
	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("unable to ping database: %v", err)
	}

	Pool = pool
	log.Println("[DB] Connected to PostgreSQL successfully")

	// Set up Timescale Pool
	timescaleURL := os.Getenv("TIMESCALE_URL")
	if timescaleURL != "" {
		tsConfig, err := pgxpool.ParseConfig(timescaleURL)
		if err != nil {
			return fmt.Errorf("unable to parse TIMESCALE_URL: %v", err)
		}

		tsConfig.MaxConns = 25
		tsConfig.MinConns = 5

		ts, err := pgxpool.NewWithConfig(context.Background(), tsConfig)
		if err != nil {
			return fmt.Errorf("unable to create TimescaleDB pool: %v", err)
		}

		if err := ts.Ping(context.Background()); err != nil {
			log.Printf("[DB] WARNING: Could not ping TimescaleDB at %s: %v. App will start but telemetry might fail.", timescaleURL, err)
			// Don't return error, let app start
			TimescalePool = pool // Fallback to main pool temporarily
		} else {
			TimescalePool = ts
			log.Println("[DB] Connected to TimescaleDB successfully")
		}
	} else {
		// If no dedicated TimescaleDB, fallback to main Pool
		TimescalePool = pool
		log.Println("[DB] Using main PostgreSQL pool for Telemetry (No TIMESCALE_URL set)")
	}

	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
	}
}
