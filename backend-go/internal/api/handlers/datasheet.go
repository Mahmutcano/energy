package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DatasheetPoint struct {
	ID                uuid.UUID `json:"id"`
	ProfileID         uuid.UUID `json:"profileId"`
	DataName          string    `json:"dataName"`
	DataValue         *string   `json:"dataValue"` // Kept for compatibility, mapped to dataExplanation or NULL
	DataExplanation   *string   `json:"dataExplanation"`
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
	RecordingInterval *int      `json:"recordingInterval"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         *time.Time `json:"updatedAt"`
	CreatedBy         *uuid.UUID `json:"createdBy"`
	UpdatedBy         *uuid.UUID `json:"updatedBy"`
}

func GetDatasheetPoints(c *gin.Context) {
	profileID := c.Query("profileId")
	if profileID == "" {
		profileID = c.Param("profileId")
	}
	rows, err := db.Pool.Query(context.Background(), `
		SELECT 
			id, "profileId", "dataName", unit as "dataValue", "dataExplanation", address as "registerAddress", 
			"isActive", "functionCode", multiplier, "wordSwap", "feederName", 
			"signalType", "dataExplanation" as "signalDescription", "dataType", "signalSource", 
			"componentId", "dataExplanation" as "componentText", address as "ioa1ObjectAddress", "ioa2CellNo", 
			"ioa3Voltage_level", address as "scadaAddress", "recordingInterval",
			"createdAt", "updatedAt", "createdBy", "updatedBy"
		FROM "DatasheetPoint"
		WHERE "profileId" = $1
		ORDER BY address ASC NULLS LAST
	`, profileID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var points []DatasheetPoint
	for rows.Next() {
		var p DatasheetPoint
		if err := rows.Scan(
			&p.ID, &p.ProfileID, &p.DataName, &p.DataValue, &p.DataExplanation, &p.RegisterAddress,
			&p.IsActive, &p.FunctionCode, &p.Multiplier, &p.WordSwap, &p.FeederName,
			&p.SignalType, &p.SignalDescription, &p.DataType, &p.SignalSource,
			&p.ComponentID, &p.ComponentText, &p.Ioa1ObjectAddress, &p.Ioa2CellNo,
			&p.Ioa3VoltageLevel, &p.ScadaAddress, &p.RecordingInterval,
			&p.CreatedAt, &p.UpdatedAt, &p.CreatedBy, &p.UpdatedBy,
		); err != nil {
			log.Printf("[DB] Error scanning datasheet point: %v", err)
			continue
		}
		points = append(points, p)
	}

	if points == nil {
		points = []DatasheetPoint{}
	}

	response.Success(c, http.StatusOK, points)
}

func CreateDatasheetPoint(c *gin.Context) {
	var p DatasheetPoint
	if err := c.ShouldBindJSON(&p); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	p.ID = uuid.New()
	address := p.RegisterAddress
	if address == nil {
		address = p.ScadaAddress
	}
	if address == nil {
		address = p.Ioa1ObjectAddress
	}

	dataExt := p.DataExplanation
	if dataExt == nil {
		dataExt = p.SignalDescription
	}
	if dataExt == nil {
		dataExt = p.ComponentText
	}

	// Get user ID from context
	var userID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		userID = &uid
	}

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "DatasheetPoint" (
			id, "profileId", "dataName", address, "dataExplanation", 
			"isActive", "functionCode", multiplier, "wordSwap", "feederName", 
			"signalType", "dataType", "signalSource", 
			"componentId", "ioa2CellNo", "ioa3Voltage_level", unit, "recordingInterval",
			"createdAt", "updatedAt", "createdBy", "updatedBy"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NULL, $19, NULL)
	`, p.ID, p.ProfileID, p.DataName, address, dataExt,
	p.IsActive, p.FunctionCode, p.Multiplier, p.WordSwap, p.FeederName,
	p.SignalType, p.DataType, p.SignalSource,
	p.ComponentID, p.Ioa2CellNo, p.Ioa3VoltageLevel, p.DataValue, p.RecordingInterval, userID)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, p)
}

// BulkCreateDatasheetPoints handles POST /api/datasheets/bulk
func BulkCreateDatasheetPoints(c *gin.Context) {
	var req struct {
		ProfileID uuid.UUID `json:"profileId"`
		Points    []struct {
			DataName          string   `json:"dataName"`
			DataValue         *string  `json:"dataValue"`
			DataExplanation   *string  `json:"dataExplanation"`
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
			RecordingInterval *int     `json:"recordingInterval"`
		} `json:"points"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	// Get creator
	var creatorID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		creatorID = &uid
	}

	ctx := context.Background()
	inserted := 0
	for _, p := range req.Points {
		id := uuid.New()
		address := p.RegisterAddress
		if address == nil {
			address = p.ScadaAddress
		}
		if address == nil {
			address = p.Ioa1ObjectAddress
		}

		dataExt := p.DataExplanation
		if dataExt == nil {
			dataExt = p.SignalDescription
		}
		if dataExt == nil {
			dataExt = p.ComponentText
		}

		_, err := db.Pool.Exec(ctx, `
			INSERT INTO "DatasheetPoint" (
				id, "profileId", "dataName", address, "dataExplanation", 
				"isActive", "functionCode", multiplier, "wordSwap", "feederName", 
				"signalType", "dataType", "signalSource", "componentId", 
				"ioa2CellNo", "ioa3Voltage_level", unit, "recordingInterval", 
				"createdAt", "updatedAt", "createdBy", "updatedBy"
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NULL, $19, NULL)
		`, id, req.ProfileID, p.DataName, address, dataExt,
			p.IsActive, p.FunctionCode, p.Multiplier, p.WordSwap, p.FeederName,
			p.SignalType, p.DataType, p.SignalSource, p.ComponentID,
			p.Ioa2CellNo, p.Ioa3VoltageLevel, p.DataValue, p.RecordingInterval, creatorID)

		if err == nil {
			inserted++
		}
	}

	response.Success(c, http.StatusOK, gin.H{"length": inserted, "message": "bulk success"})
}

func UpdateDatasheetPoint(c *gin.Context) {
	idStr := c.Param("id")
	pointID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid ID")
		return
	}

	var p DatasheetPoint
	if err := c.ShouldBindJSON(&p); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	address := p.RegisterAddress
	if address == nil {
		address = p.ScadaAddress
	}
	if address == nil {
		address = p.Ioa1ObjectAddress
	}

	dataExt := p.DataExplanation
	if dataExt == nil {
		dataExt = p.SignalDescription
	}
	if dataExt == nil {
		dataExt = p.ComponentText
	}

	// Get updater ID
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}

	_, err = db.Pool.Exec(context.Background(), `
		UPDATE "DatasheetPoint" SET
			"dataName" = $1, address = $2, "dataExplanation" = $3, 
			"isActive" = $4, "functionCode" = $5, multiplier = $6, "wordSwap" = $7, "feederName" = $8, 
			"signalType" = $9, "dataType" = $10, "signalSource" = $11, 
			"componentId" = $12, "ioa2CellNo" = $13, "ioa3Voltage_level" = $14,
			unit = $15, "recordingInterval" = $16, "updatedAt" = NOW(), "updatedBy" = $17
		WHERE id = $18
	`, p.DataName, address, dataExt,
		p.IsActive, p.FunctionCode, p.Multiplier, p.WordSwap, p.FeederName,
		p.SignalType, p.DataType, p.SignalSource,
		p.ComponentID, p.Ioa2CellNo, p.Ioa3VoltageLevel, p.DataValue, p.RecordingInterval, updaterID, pointID)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	p.ID = pointID
	response.Success(c, http.StatusOK, p)
}

func DeleteDatasheetPoint(c *gin.Context) {
	idStr := c.Param("id")
	pointID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid ID")
		return
	}

	_, err = db.Pool.Exec(context.Background(), `DELETE FROM "DatasheetPoint" WHERE id = $1`, pointID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "deleted"})
}
