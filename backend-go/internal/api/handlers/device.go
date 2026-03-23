package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
	Protocol           *ProtocolBrief `json:"protocol,omitempty"`
	DatasheetProfile   *ProfileBrief  `json:"datasheetProfile,omitempty"`
}

func GetDevices(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT 
			d.id, d."deviceName", d."deviceType", d."isActive", d."isRecording", d.protocol_config_id, d.datasheet_profile_id,
			pc."configName", pc."protocolType", pc.plant_id, p."plantName",
			dp.name as profile_name, dp."protocolType" as profile_proto
		FROM "Device" d
		LEFT JOIN "ProtocolConfig" pc ON d.protocol_config_id = pc.id
		LEFT JOIN "Plant" p ON pc.plant_id = p.id
		LEFT JOIN "DatasheetProfile" dp ON d.datasheet_profile_id = dp.id
	`)
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

	fields := []string{"deviceName", "deviceType", "isActive", "isRecording", "protocolConfigId", "datasheetProfileId"}
	for _, f := range fields {
		if val, ok := body[f]; ok {
			queryParts = append(queryParts, fmt.Sprintf("\"%s\" = $%d", f, idx))
			args = append(args, val)
			idx++
		}
	}

	if len(queryParts) == 0 {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Güncellenecek alan bulunamadı")
		return
	}

	query := "UPDATE \"Device\" SET " + fmt.Sprintf("%s", queryParts[0])
	for i := 1; i < len(queryParts); i++ {
		query += ", " + queryParts[i]
	}
	query += " WHERE id = $" + fmt.Sprintf("%d", idx)
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

	id := uuid.New()
	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "Device" (id, "deviceName", "deviceType", "isActive", "isRecording", protocol_config_id, datasheet_profile_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, id, body.DeviceName, body.DeviceType, body.IsActive, true, body.ProtocolConfigID, body.DatasheetProfileID)

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

	_, err = db.Pool.Exec(context.Background(), "DELETE FROM \"Device\" WHERE id = $1", id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Cihaz silindi"})
}
