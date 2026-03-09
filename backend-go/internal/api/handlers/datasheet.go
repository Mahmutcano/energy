package handlers

import (
	"context"
	"net/http"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DatasheetPoint struct {
	ID                uuid.UUID `json:"id"`
	ProfileID         uuid.UUID `json:"profileId"`
	DataName          string    `json:"dataName"`
	DataValue         *string   `json:"dataValue"`
	RegisterAddress   *int      `json:"registerAddress"`
	IsActive          bool      `json:"isActive"`
	FunctionCode      *int      `json:"functionCode"`
	Multiplier        *float64  `json:"multiplier"`
	WordSwap          bool      `json:"wordSwap"`
	FeederName        *string   `json:"feederName"`
	SignalType        *string   `json:"signalType"`
	SignalDescription *string   `json:"signalDescription"`
	DataType          *string   `json:"dataType"`
	SignalSource      *string   `json:"signalSource"`
	ComponentID       *string   `json:"componentId"`
	ComponentText     *string   `json:"componentText"`
	Ioa1ObjectAddress *int      `json:"ioa1ObjectAddress"`
	Ioa2CellNo        *int      `json:"ioa2CellNo"`
	Ioa3VoltageLevel  *int      `json:"ioa3VoltageLevel"`
	ScadaAddress      *int      `json:"scadaAddress"`
}

func GetDatasheetPoints(c *gin.Context) {
	profileID := c.Query("profileId")
	if profileID == "" {
		profileID = c.Param("profileId") // Fallback for path-style
	}
	rows, err := db.Pool.Query(context.Background(), `
		SELECT 
			id, profile_id, "dataName", "dataValue", "registerAddress", 
			"isActive", "functionCode", "multiplier", "wordSwap", "feederName", 
			"signalType", "signalDescription", "dataType", "signalSource", 
			"componentId", "componentText", "ioa1ObjectAddress", "ioa2CellNo", 
			"ioa3VoltageLevel", "scadaAddress"
		FROM "DatasheetPoint"
		WHERE profile_id = $1
	`, profileID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var points []DatasheetPoint
	for rows.Next() {
		var p DatasheetPoint
		if err := rows.Scan(
			&p.ID, &p.ProfileID, &p.DataName, &p.DataValue, &p.RegisterAddress,
			&p.IsActive, &p.FunctionCode, &p.Multiplier, &p.WordSwap, &p.FeederName,
			&p.SignalType, &p.SignalDescription, &p.DataType, &p.SignalSource,
			&p.ComponentID, &p.ComponentText, &p.Ioa1ObjectAddress, &p.Ioa2CellNo,
			&p.Ioa3VoltageLevel, &p.ScadaAddress,
		); err != nil {
			continue
		}
		points = append(points, p)
	}

	if points == nil {
		points = []DatasheetPoint{}
	}

	c.JSON(http.StatusOK, points)
}

func CreateDatasheetPoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"id": uuid.New(), "message": "created mock (to be implemented)"})
}

// BulkCreateDatasheetPoints handles POST /api/datasheets/bulk
func BulkCreateDatasheetPoints(c *gin.Context) {
	var req struct {
		ProfileID uuid.UUID `json:"profileId"`
		Points    []struct {
			DataName          string   `json:"dataName"`
			DataValue         *string  `json:"dataValue"`
			RegisterAddress   *int     `json:"registerAddress"`
			FunctionCode      *int     `json:"functionCode"`
			Multiplier        *float64 `json:"multiplier"`
			WordSwap          bool     `json:"wordSwap"`
			FeederName        *string  `json:"feederName"`
			SignalType        *string  `json:"signalType"`
			SignalDescription *string  `json:"signalDescription"`
			DataType          *string  `json:"dataType"`
			SignalSource      *string  `json:"signalSource"`
			ComponentID       *string  `json:"componentId"`
			ComponentText     *string  `json:"componentText"`
			Ioa1ObjectAddress *int     `json:"ioa1ObjectAddress"`
			Ioa2CellNo        *int     `json:"ioa2CellNo"`
			Ioa3VoltageLevel  *int     `json:"ioa3VoltageLevel"`
			ScadaAddress      *int     `json:"scadaAddress"`
			IsActive          bool     `json:"isActive"`
		} `json:"points"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()
	inserted := 0
	for _, p := range req.Points {
		id := uuid.New()
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO "DatasheetPoint" (
				id, profile_id, "dataName", "dataValue", "registerAddress", 
				"functionCode", multiplier, "wordSwap", "feederName", "signalType", 
				"signalDescription", "dataType", "signalSource", "componentId", 
				"componentText", "ioa1ObjectAddress", "ioa2CellNo", "ioa3VoltageLevel", "scadaAddress", "isActive"
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
		`, id, req.ProfileID, p.DataName, p.DataValue, p.RegisterAddress,
			p.FunctionCode, p.Multiplier, p.WordSwap, p.FeederName, p.SignalType,
			p.SignalDescription, p.DataType, p.SignalSource, p.ComponentID,
			p.ComponentText, p.Ioa1ObjectAddress, p.Ioa2CellNo, p.Ioa3VoltageLevel, p.ScadaAddress, p.IsActive)

		if err == nil {
			inserted++
		}
	}

	c.JSON(http.StatusOK, gin.H{"length": inserted, "message": "bulk success"})
}

func DeleteDatasheetPoint(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
