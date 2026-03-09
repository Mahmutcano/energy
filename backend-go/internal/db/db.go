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
		if err == nil {
			tsConfig.MaxConns = 25
			tsConfig.MinConns = 5
			tsConfig.MaxConnLifetime = time.Hour
			tsConfig.MaxConnIdleTime = 30 * time.Minute

			ts, err := pgxpool.NewWithConfig(context.Background(), tsConfig)
			if err == nil {
				if err := ts.Ping(context.Background()); err == nil {
					TimescalePool = ts
					log.Println("[DB] Connected to TimescaleDB successfully")
				} else {
					log.Printf("[DB] Warning: Could not ping TimescaleDB: %v", err)
					TimescalePool = pool
				}
			} else {
				TimescalePool = pool
			}
		} else {
			TimescalePool = pool
		}
	} else {
		TimescalePool = pool
	}

	return nil
}

func Close() {
	if Pool != nil {
		Pool.Close()
	}
}
