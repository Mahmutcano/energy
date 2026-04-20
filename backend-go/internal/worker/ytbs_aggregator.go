package worker

import (
	"context"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

type YtbsAggregator struct{}

func NewYtbsAggregator() *YtbsAggregator {
	return &YtbsAggregator{}
}

func (w *YtbsAggregator) Start(ctx context.Context) {
	log.Println("[YTBS-AGG] Aggregator started...")
	
	// Minute 5: Hourly Aggregation
	// Minute 2, 17, 32, 47: 15-min Aggregation
	
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			mins := t.Minute()
			if mins == 5 {
				log.Println("[YTBS-AGG] Running Hourly Aggregation...")
				w.AggregateHourly()
			}
			if mins == 2 || mins == 17 || mins == 32 || mins == 47 {
				log.Println("[YTBS-AGG] Running 15-min Aggregation...")
				w.AggregateInstant()
			}
		}
	}
}

func (w *YtbsAggregator) AggregateHourly() {
	// 1. Get all active YTBS plants
	rows, err := db.Pool.Query(context.Background(), `SELECT id, "plantId", "ytbsId" FROM "YtbsPlant" WHERE "isActive" = true`)
	if err != nil {
		return
	}
	defer rows.Close()

	now := time.Now().Add(-1 * time.Hour)
	dateStr := now.Format("2006-01-02")
	hourStr := fmt.Sprintf("%02d:00", now.Hour())

	for rows.Next() {
		var yp models.YtbsPlant
		if err := rows.Scan(&yp.ID, &yp.PlantID, &yp.YtbsID); err == nil {
			// Aggregation logic placeholder (Sum telemetry for hour)
			// For now we just insert a default/calculated value
			val := 42.0 // Real logic would query TelemetryValue sum
			
			_, err = db.Pool.Exec(context.Background(), `
				INSERT INTO "YtbsHourlyProduction" 
				(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingHour", "valueMwh", "isSent", "createdAt")
				VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
				ON CONFLICT ("ytbsPlantId", "readingDate", "readingHour") 
				DO UPDATE SET "valueMwh" = EXCLUDED."valueMwh", "isSent" = false
			`, uuid.New(), yp.PlantID, yp.YtbsID, yp.ID, dateStr, hourStr, val)
		}
	}
}

func (w *YtbsAggregator) AggregateInstant() {
	rows, err := db.Pool.Query(context.Background(), `SELECT id, "plantId", "ytbsId" FROM "YtbsPlant" WHERE "isActive" = true`)
	if err != nil {
		return
	}
	defer rows.Close()

	now := time.Now().Add(-15 * time.Minute)
	dateStr := now.Format("2006-01-02")
	timeStr := now.Format("15:04")

	for rows.Next() {
		var yp models.YtbsPlant
		if err := rows.Scan(&yp.ID, &yp.PlantID, &yp.YtbsID); err == nil {
			val := 12.5 // Real logic would average TelemetryValue
			
			_, err = db.Pool.Exec(context.Background(), `
				INSERT INTO "YtbsInstantProduction" 
				(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingTime", "valueMw", "isSent", "createdAt")
				VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
				ON CONFLICT ("ytbsPlantId", "readingDate", "readingTime") 
				DO UPDATE SET "valueMw" = EXCLUDED."valueMw", "isSent" = false
			`, uuid.New(), yp.PlantID, yp.YtbsID, yp.ID, dateStr, timeStr, val)
		}
	}
}
