package handlers

import (
	"context"
	"log"
	"net/http"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type DatasheetProfile struct {
	ID           uuid.UUID     `json:"id"`
	Name         string        `json:"name"`
	ProtocolType string        `json:"protocolType"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    *time.Time    `json:"updatedAt"`
	CreatedBy    *uuid.UUID    `json:"createdBy"`
	UpdatedBy    *uuid.UUID    `json:"updatedBy"`
	Count        *ProfileCount `json:"_count,omitempty"`
}

type ProfileCount struct {
	Points  int `json:"points"`
	Devices int `json:"devices"`
}

func GetDatasheetProfiles(c *gin.Context) {
	var rows pgx.Rows
	var err error

	rows, err = db.Pool.Query(context.Background(), `
		SELECT 
			dp.id, dp.name, dp."protocolType",
			(SELECT COUNT(*) FROM "DatasheetPoint" p WHERE p."profileId" = dp.id) as point_count,
			(SELECT COUNT(*) FROM "Device" d WHERE d."datasheetProfileId" = dp.id) as device_count,
			dp."createdAt", dp."updatedAt", dp."createdBy", dp."updatedBy"
		FROM "DatasheetProfile" dp
		ORDER BY dp."createdAt" DESC
	`)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var profiles []DatasheetProfile
	for rows.Next() {
		var p DatasheetProfile
		var cCount ProfileCount
		if err := rows.Scan(&p.ID, &p.Name, &p.ProtocolType, &cCount.Points, &cCount.Devices, &p.CreatedAt, &p.UpdatedAt, &p.CreatedBy, &p.UpdatedBy); err != nil {
			log.Printf("[DB] Error scanning datasheet profile: %v", err)
			continue
		}
		p.Count = &cCount

		profiles = append(profiles, p)
	}

	if profiles == nil {
		profiles = []DatasheetProfile{}
	}

	response.Success(c, http.StatusOK, profiles)
}

func CreateDatasheetProfile(c *gin.Context) {
	log.Println("[API] POST /api/datasheet-profiles hit")
	var req struct {
		Name         string `json:"name" binding:"required"`
		ProtocolType string `json:"protocolType" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "İsim ve protokol tipi zorunludur")
		return
	}

	// Double check ProtocolType enum
	if req.ProtocolType != "MODBUS" && req.ProtocolType != "IEC104" {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Protokol tipi MODBUS veya IEC104 olmalıdır")
		return
	}

	// Get creator
	var creatorID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		creatorID = &uid
	}

	profileID := uuid.New()
	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "DatasheetProfile" (id, name, "protocolType", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, NOW(), NULL, $4, NULL)
	`, profileID, req.Name, req.ProtocolType, creatorID)

	if err != nil {
		log.Printf("[DB] INSERT Error (DatasheetProfile): %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Veritabanına kaydedilirken bir hata oluştu")
		return
	}

	response.Success(c, http.StatusCreated, gin.H{
		"id":           profileID,
		"name":         req.Name,
		"protocolType": req.ProtocolType,
	})
}

func UpdateDatasheetProfile(c *gin.Context) {
	idStr := c.Param("id")
	profileID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID formatı")
		return
	}

	var req struct {
		Name         string `json:"name" binding:"required"`
		ProtocolType string `json:"protocolType" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "İsim ve protokol tipi zorunludur")
		return
	}

	// Get updater ID
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}

	result, err := db.Pool.Exec(context.Background(), `
		UPDATE "DatasheetProfile" SET name = $1, "protocolType" = $2, "updatedAt" = NOW(), "updatedBy" = $3
		WHERE id = $4
	`, req.Name, req.ProtocolType, updaterID, profileID)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Güncelleme sırasında bir veritabanı hatası oluştu")
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Profil bulunamadı")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Profil başarıyla güncellendi"})
}

func DeleteDatasheetProfile(c *gin.Context) {
	idStr := c.Param("id")
	profileID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID formatı")
		return
	}

	result, err := db.Pool.Exec(context.Background(), `DELETE FROM "DatasheetProfile" WHERE id = $1`, profileID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Silme işlemi sırasında bir veritabanı hatası oluştu")
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Profil bulunamadı")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Profil başarıyla silindi"})
}
