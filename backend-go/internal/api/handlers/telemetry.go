package handlers

import (
	"context"
	"net/http"
	"time"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
)

func GetTelemetry(c *gin.Context) {
	deviceID := c.Param("deviceId")

	// Default range: last 1 hour
	rows, err := db.Pool.Query(context.Background(), `
		SELECT "pointId", "measurementTime", "valueNumeric"
		FROM "TelemetryValue"
		WHERE device_id = $1 AND "measurementTime" > NOW() - INTERVAL '1 hour'
		ORDER BY "measurementTime" ASC
	`, deviceID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	results := make([]gin.H, 0)
	for rows.Next() {
		var pID string
		var mTime time.Time
		var val float64
		if err := rows.Scan(&pID, &mTime, &val); err != nil {
			continue
		}
		results = append(results, gin.H{
			"pointId": pID,
			"time":    mTime,
			"value":   val,
		})
	}

	c.JSON(http.StatusOK, results)
}

func GetTelemetryHistory(c *gin.Context) {
	deviceID := c.Query("deviceId")
	pointID := c.Query("pointId")
	hoursStr := c.Query("hours")

	if deviceID == "" || pointID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "deviceId and pointId are required"})
		return
	}

	interval := "24 hours"
	if hoursStr != "" {
		interval = hoursStr + " hours"
	}

	query := `
		SELECT "measurementTime", "valueNumeric"
		FROM "TelemetryValue"
		WHERE device_id = $1 AND "pointId" = $2 AND "measurementTime" > NOW() - $3::interval
		ORDER BY "measurementTime" ASC
	`
	rows, err := db.TimescalePool.Query(context.Background(), query, deviceID, pointID, interval)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	results := make([]gin.H, 0)
	for rows.Next() {
		var mTime time.Time
		var val float64
		if err := rows.Scan(&mTime, &val); err != nil {
			continue
		}
		results = append(results, gin.H{
			"time":  mTime, // Use 'time' to match frontend expects 'd.time'
			"value": val,
		})
	}

	c.JSON(http.StatusOK, results)
}
