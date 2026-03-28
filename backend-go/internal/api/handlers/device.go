package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type ProtocolBrief struct {
	ID           uuid.UUID `json:"id"`
	ConfigName   string    `json:"configName"`
	ProtocolType string    `json:"protocolType"`
	Plant        *struct {
		ID        uuid.UUID `json:"id"`
		PlantName string    `json:"plantName"`
	} `json:"plant,omitempty"`
}

type ProfileBrief struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	ProtocolType string    `json:"protocolType"`
}

type DeviceInfo struct {
	ID                 uuid.UUID      `json:"id"`
	DeviceName         string         `json:"deviceName"`
	DeviceType         string         `json:"deviceType"`
	IsActive           bool           `json:"isActive"`
	IsRecording        bool           `json:"isRecording"`
	ProtocolConfigID   uuid.UUID      `json:"protocolConfigId"`
	DatasheetProfileID *uuid.UUID     `json:"datasheetProfileId"`
	CreatedAt          time.Time      `json:"createdAt"`
	UpdatedAt          time.Time      `json:"updatedAt"`
	CreatedBy          *uuid.UUID     `json:"createdBy"`
	UpdatedBy          *uuid.UUID     `json:"updatedBy"`
	Protocol           *ProtocolBrief `json:"protocol,omitempty"`
	DatasheetProfile   *ProfileBrief  `json:"datasheetProfile,omitempty"`
}

func GetDevices(c *gin.Context) {
	companyID, role := getUserCompanyID(c)
	var rows pgx.Rows
	var err error

	if role == "SUPER_ADMIN" {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT 
				d.id, d."deviceName", d."deviceType", d."isActive", d."isRecording", d."protocolConfigId", d."datasheetProfileId",
				pc."configName", pc."protocolType", pc."plantId", p."plantName",
				dp.name as profile_name, dp."protocolType" as profile_proto,
				d."createdAt", d."updatedAt", d."createdBy", d."updatedBy"
			FROM "Device" d
			LEFT JOIN "ProtocolConfig" pc ON d."protocolConfigId" = pc.id
			LEFT JOIN "Plant" p ON pc."plantId" = p.id
			LEFT JOIN "DatasheetProfile" dp ON d."datasheetProfileId" = dp.id
			ORDER BY d."createdAt" DESC
		`)
	} else if companyID != nil {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT 
				d.id, d."deviceName", d."deviceType", d."isActive", d."isRecording", d."protocolConfigId", d."datasheetProfileId",
				pc."configName", pc."protocolType", pc."plantId", p."plantName",
				dp.name as profile_name, dp."protocolType" as profile_proto,
				d."createdAt", d."updatedAt", d."createdBy", d."updatedBy"
			FROM "Device" d
			JOIN "ProtocolConfig" pc ON d."protocolConfigId" = pc.id
			JOIN "Plant" p ON pc."plantId" = p.id
			LEFT JOIN "DatasheetProfile" dp ON d."datasheetProfileId" = dp.id
			WHERE p."companyId" = $1
			ORDER BY d."createdAt" DESC
		`, *companyID)
	} else {
		response.Success(c, http.StatusOK, []any{})
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var devices []DeviceInfo
	for rows.Next() {
		var d DeviceInfo
		var pcName, pcProto, plantName, dpName, dpProto *string
		var plantID *uuid.UUID
		if err := rows.Scan(
			&d.ID, &d.DeviceName, &d.DeviceType, &d.IsActive, &d.IsRecording, &d.ProtocolConfigID, &d.DatasheetProfileID,
			&pcName, &pcProto, &plantID, &plantName, &dpName, &dpProto,
			&d.CreatedAt, &d.UpdatedAt, &d.CreatedBy, &d.UpdatedBy,
		); err != nil {
			log.Printf("[DB] Error scanning device: %v", err)
			continue
		}

		if pcName != nil {
			d.Protocol = &ProtocolBrief{
				ID:           d.ProtocolConfigID,
				ConfigName:   *pcName,
				ProtocolType: *pcProto,
			}
			if plantName != nil && plantID != nil {
				d.Protocol.Plant = &struct {
					ID        uuid.UUID `json:"id"`
					PlantName string    `json:"plantName"`
				}{ID: *plantID, PlantName: *plantName}
			}
		}

		if d.DatasheetProfileID != nil && dpName != nil {
			d.DatasheetProfile = &ProfileBrief{
				ID:           *d.DatasheetProfileID,
				Name:         *dpName,
				ProtocolType: *dpProto,
			}
		}

		devices = append(devices, d)
	}

	if devices == nil {
		devices = []DeviceInfo{}
	}

	response.Success(c, http.StatusOK, devices)
}

func UpdateDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Cihaz ID hatalı")
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	// Dynamic update based on provided fields
	var queryParts []string
	var args []interface{}
	idx := 1

	fieldMapping := map[string]string{
		"deviceName":         "\"deviceName\"",
		"deviceType":         "\"deviceType\"",
		"isActive":           "\"isActive\"",
		"isRecording":        "\"isRecording\"",
		"protocolConfigId":   "\"protocolConfigId\"",
		"datasheetProfileId": "\"datasheetProfileId\"",
	}

	for jsonField, dbColumn := range fieldMapping {
		if val, ok := body[jsonField]; ok {
			queryParts = append(queryParts, fmt.Sprintf("%s = $%d", dbColumn, idx))
			args = append(args, val)
			idx++
		}
	}

	query := "UPDATE \"Device\" SET " + strings.Join(queryParts, ", ")
	query += ", \"updatedAt\" = NOW(), \"updatedBy\" = $" + fmt.Sprintf("%d", idx) + " WHERE id = $" + fmt.Sprintf("%d", idx+1)
	
	// Get updater ID from context (JWT)
	updaterIDStr, _ := c.Get("user_id")
	if updaterIDStr != nil {
		uid, _ := uuid.Parse(updaterIDStr.(string))
		args = append(args, uid)
	} else {
		args = append(args, nil)
	}
	args = append(args, id)

	_, err = db.Pool.Exec(context.Background(), query, args...)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Cihaz güncellendi"})
}

func CreateDevice(c *gin.Context) {
	var body struct {
		DeviceName         string     `json:"deviceName" binding:"required"`
		DeviceType         string     `json:"deviceType" binding:"required"`
		IsActive           bool       `json:"isActive"`
		ProtocolConfigID   uuid.UUID  `json:"protocolConfigId" binding:"required"`
		DatasheetProfileID *uuid.UUID `json:"datasheetProfileId"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
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

	id := uuid.New()
	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "Device" (id, "deviceName", "deviceType", "isActive", "isRecording", "protocolConfigId", "datasheetProfileId", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $9)
	`, id, body.DeviceName, body.DeviceType, body.IsActive, true, body.ProtocolConfigID, body.DatasheetProfileID, creatorID, creatorID)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, gin.H{"id": id, "message": "Cihaz oluşturuldu"})
}

func DeleteDevice(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Cihaz ID hatalı")
		return
	}

	// Delete related alarms first
	_, _ = db.Pool.Exec(context.Background(), `DELETE FROM "CommunicationAlarm" WHERE "deviceId" = $1`, id)

	_, err = db.Pool.Exec(context.Background(), `DELETE FROM "Device" WHERE id = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Cihaz silindi"})
}
