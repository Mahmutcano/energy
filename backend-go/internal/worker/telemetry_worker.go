package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/redis"

	"github.com/jackc/pgx/v5"
)

type TelemetryWorker struct {
	redisSvc *redis.RedisService
}

func NewTelemetryWorker() *TelemetryWorker {
	return &TelemetryWorker{
		redisSvc: redis.GetInstance(),
	}
}

func (w *TelemetryWorker) Start(ctx context.Context) {
	log.Println("[WORKER] Telemetry Persistence Worker Started")

	// Use a ticker for batching if needed, or just pop as fast as possible
	for {
		select {
		case <-ctx.Done():
			return
		default:
			w.processBatch()
		}
	}
}

func (w *TelemetryWorker) processBatch() {
	// Simple pop for now, can be optimized with pipelines later
	// In Go, we can pop multiple items or just one very fast

	// We'll use a local buffer to batch inserts into Postgres
	batchSize := 50
	buffer := make([]models.TelemetryData, 0, batchSize)

	for i := 0; i < batchSize; i++ {
		// Use a short timeout for popping
		item, _ := redis.Client.BRPop(context.Background(), 1*time.Second, "telemetry_queue").Result()
		if len(item) < 2 {
			break
		}

		var data models.TelemetryData
		if err := json.Unmarshal([]byte(item[1]), &data); err != nil {
			continue
		}
		buffer = append(buffer, data)
	}

	if len(buffer) == 0 {
		return
	}

	// High-performance CopyFrom
	identifier := pgx.Identifier{"TelemetryValue"}
	columns := []string{"device_id", "pointId", "measurementTime", "valueNumeric"}

	rows := [][]interface{}{}
	for _, d := range buffer {
		rows = append(rows, []interface{}{d.DeviceID, d.PointID, d.Timestamp, d.Value})
	}

	_, err := db.TimescalePool.CopyFrom(
		context.Background(),
		identifier,
		columns,
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		log.Printf("[WORKER] CopyFrom Error: %v", err)
	}
}
