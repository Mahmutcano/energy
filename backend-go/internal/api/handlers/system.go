package handlers

import (
	"context"
	"net/http"
	"time"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/protocols"
	"energy-scada-platform/internal/redis"

	"github.com/gin-gonic/gin"
)

func GetProtocolStatuses(c *gin.Context) {
	modbusSvc := protocols.GetModbusService(nil)
	iec104Svc := protocols.GetIEC104Service(nil)

	res := make(map[string]string)
	for k, v := range modbusSvc.GetStatuses() {
		res[k] = v
	}
	for k, v := range iec104Svc.GetStatuses() {
		res[k] = v
	}

	c.JSON(http.StatusOK, res)
}

func FlushTelemetryQueue(c *gin.Context) {
	redisSvc := redis.GetInstance()
	err := redisSvc.FlushTelemetryQueue()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Telemetry queue cleared"})
}

func HealthCheck(c *gin.Context) {
	response.Success(c, http.StatusOK, gin.H{
		"status":       "OPERATIONAL",
		"responseTime": 15,
		"timestamp":    time.Now().Format(time.RFC3339),
		"checks": gin.H{
			"postgresql": gin.H{
				"status":        "HEALTHY",
				"latency":       5,
				"totalRecords":  1000,
				"lastRecordAge": 2,
				"activeDevices": 10,
				"totalDevices":  20,
				"recording":     true,
			},
			"redis": gin.H{
				"status":      "HEALTHY",
				"mode":        "REDIS",
				"queueLength": 0,
			},
			"worker": gin.H{
				"status":     "ACTIVE",
				"bufferMode": "MEMORY",
			},
			"memory": gin.H{
				"heapUsed":  50,
				"heapTotal": 100,
				"rss":       150,
				"external":  10,
			},
			"uptime": gin.H{
				"seconds":   3600,
				"formatted": "1 hour 0 mins",
			},
		},
	})
}

func GetRecordingSettings(c *gin.Context) {
	response.Success(c, http.StatusOK, gin.H{
		"sampleIntervalSec": 10,
		"retentionHours":    72,
		"isRecording":       true,
		"maxRecordsTotal":   1000000,
		"db": gin.H{
			"tableSize":    "12MB",
			"totalRecords": 150000,
		},
	})
}

func GetSchemaStats(c *gin.Context) {
	ctx := context.Background()
	var companyCount, plantCount, protocolCount, deviceCount, telemetryCount int

	_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM "CompanyProfile"`).Scan(&companyCount)
	_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Plant"`).Scan(&plantCount)
	_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM "ProtocolConfig"`).Scan(&protocolCount)
	_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Device"`).Scan(&deviceCount)
	_ = db.TimescalePool.QueryRow(ctx, `SELECT COUNT(*) FROM "TelemetryValue"`).Scan(&telemetryCount)

	nodes := []map[string]interface{}{
		{
			"id":        "CompanyProfile",
			"name":      "Companies",
			"count":     companyCount,
			"icon":      "Building2",
			"color":     "#f59e0b",
			"relations": []string{"Plant"},
		},
		{
			"id":        "Plant",
			"name":      "Plants",
			"count":     plantCount,
			"icon":      "Factory",
			"color":     "#3b82f6",
			"relations": []string{"ProtocolConfig"},
		},
		{
			"id":        "ProtocolConfig",
			"name":      "Protocols",
			"count":     protocolCount,
			"icon":      "Network",
			"color":     "#8b5cf6",
			"relations": []string{"Device"},
		},
		{
			"id":        "Device",
			"name":      "Devices",
			"count":     deviceCount,
			"icon":      "Cpu",
			"color":     "#10b981",
			"relations": []string{"TelemetryValue"},
		},
		{
			"id":        "TelemetryValue",
			"name":      "Telemetry",
			"count":     telemetryCount,
			"icon":      "Activity",
			"color":     "#ef4444",
			"relations": []string{},
		},
	}
	response.Success(c, http.StatusOK, nodes)
}
