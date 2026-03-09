package handlers

import (
	"context"
	"net/http"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DatasheetProfile struct {
	ID           uuid.UUID     `json:"id"`
	Name         string        `json:"name"`
	ProtocolType string        `json:"protocolType"`
	Count        *ProfileCount `json:"_count,omitempty"`
}

type ProfileCount struct {
	Points  int `json:"points"`
	Devices int `json:"devices"`
}

func GetDatasheetProfiles(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT 
			dp.id, dp.name, dp."protocolType",
			(SELECT COUNT(*) FROM "DatasheetPoint" p WHERE p.profile_id = dp.id) as point_count,
			(SELECT COUNT(*) FROM "Device" d WHERE d.datasheet_profile_id = dp.id) as device_count
		FROM "DatasheetProfile" dp
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var profiles []DatasheetProfile
	for rows.Next() {
		var p DatasheetProfile
		var cCount ProfileCount
		if err := rows.Scan(&p.ID, &p.Name, &p.ProtocolType, &cCount.Points, &cCount.Devices); err != nil {
			continue
		}
		p.Count = &cCount

		profiles = append(profiles, p)
	}

	if profiles == nil {
		profiles = []DatasheetProfile{}
	}

	c.JSON(http.StatusOK, profiles)
}
