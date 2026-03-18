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

func CreateDatasheetProfile(c *gin.Context) {
	var req struct {
		Name         string `json:"name"`
		ProtocolType string `json:"protocolType"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profileID := uuid.New()
	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "DatasheetProfile" (id, name, "protocolType", "isActive")
		VALUES ($1, $2, $3, $4)
	`, profileID, req.Name, req.ProtocolType, true)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": profileID, "name": req.Name, "protocolType": req.ProtocolType})
}

func UpdateDatasheetProfile(c *gin.Context) {
	idStr := c.Param("id")
	profileID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Name         string `json:"name"`
		ProtocolType string `json:"protocolType"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = db.Pool.Exec(context.Background(), `
		UPDATE "DatasheetProfile" SET name = $1, "protocolType" = $2
		WHERE id = $3
	`, req.Name, req.ProtocolType, profileID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func DeleteDatasheetProfile(c *gin.Context) {
	idStr := c.Param("id")
	profileID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	_, err = db.Pool.Exec(context.Background(), `DELETE FROM "DatasheetProfile" WHERE id = $1`, profileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile deleted successfully"})
}
