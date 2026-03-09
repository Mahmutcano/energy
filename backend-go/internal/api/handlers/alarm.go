package handlers

import (
	"context"
	"net/http"
	"time"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AlarmResponse struct {
	ID         uuid.UUID  `json:"id"`
	DeviceID   *uuid.UUID `json:"deviceId,omitempty"`
	Message    string     `json:"message"`
	Status     string     `json:"status"`
	StartTime  time.Time  `json:"startTime"`
	EndTime    *time.Time `json:"endTime,omitempty"`
	LastSeenAt *time.Time `json:"lastSeenAt,omitempty"`
}

func GetAlarms(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, device_id, message, status, "startTime", "endTime", "lastSeenAt"
		FROM "CommunicationAlarm"
		ORDER BY "startTime" DESC LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var alarms []AlarmResponse
	for rows.Next() {
		var a AlarmResponse
		if err := rows.Scan(&a.ID, &a.DeviceID, &a.Message, &a.Status, &a.StartTime, &a.EndTime, &a.LastSeenAt); err != nil {
			continue
		}
		alarms = append(alarms, a)
	}

	if alarms == nil {
		alarms = []AlarmResponse{} // Return empty array instead of null
	}

	c.JSON(http.StatusOK, alarms)
}
