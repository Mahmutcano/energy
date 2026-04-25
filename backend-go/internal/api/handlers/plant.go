package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func GetPlants(c *gin.Context) {
	ctx := getAccessContext(c)

	var rows pgx.Rows
	var err error

	if ctx.Role == "SUPER_ADMIN" {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT p.id, p."companyId", p."plantName", p."plantType", p.latitude, p.longitude, p."isActive", c.name as company_name, 
			       p."ytbsCode", p."canSendYtbs", p."createdAt", p."updatedAt", p."createdBy", p."updatedBy"
			FROM "Plant" p
			JOIN "CompanyProfile" c ON p."companyId" = c.id
			ORDER BY p."plantName" ASC
		`)
	} else if len(ctx.PlantIDs) > 0 {
		// Explicit plant links
		rows, err = db.Pool.Query(context.Background(), `
			SELECT p.id, p."companyId", p."plantName", p."plantType", p.latitude, p.longitude, p."isActive", c.name as company_name, 
			       p."ytbsCode", p."canSendYtbs", p."createdAt", p."updatedAt", p."createdBy", p."updatedBy"
			FROM "Plant" p
			JOIN "CompanyProfile" c ON p."companyId" = c.id
			WHERE p.id = ANY($1)
			ORDER BY p."plantName" ASC
		`, ctx.PlantIDs)
	} else if ctx.CompanyID != nil {
		// Company-wide access (fallback)
		rows, err = db.Pool.Query(context.Background(), `
			SELECT p.id, p."companyId", p."plantName", p."plantType", p.latitude, p.longitude, p."isActive", c.name as company_name, 
			       p."ytbsCode", p."canSendYtbs", p."createdAt", p."updatedAt", p."createdBy", p."updatedBy"
			FROM "Plant" p
			JOIN "CompanyProfile" c ON p."companyId" = c.id
			WHERE p."companyId" = $1
			ORDER BY p."plantName" ASC
		`, *ctx.CompanyID)
	} else {
		log.Printf("[PLANT] No access for user %v (Role: %s)", ctx.UserID, ctx.Role)
		response.Success(c, http.StatusOK, []any{})
		return
	}
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var plants []any
	for rows.Next() {
		var p models.Plant
		if err := rows.Scan(&p.ID, &p.CompanyID, &p.PlantName, &p.PlantType, &p.Latitude, &p.Longitude, &p.IsActive, &p.CompanyName, &p.YTBSCode, &p.CanSendYTBS, &p.CreatedAt, &p.UpdatedAt, &p.CreatedBy, &p.UpdatedBy); err != nil {
			log.Printf("[DB] Error scanning plant: %v", err)
			continue
		}

		// Fetch protocol count for this plant
		var protoCount int
		_ = db.Pool.QueryRow(context.Background(), `SELECT COUNT(*) FROM "ProtocolConfig" WHERE "plantId" = $1`, p.ID).Scan(&protoCount)

		// Create a dummy array of the right length so frontend's .length works
		protocols := make([]int, protoCount)

		plants = append(plants, gin.H{
			"id":          p.ID,
			"companyId":   p.CompanyID,
			"plantName":   p.PlantName,
			"plantType":   p.PlantType,
			"latitude":    p.Latitude,
			"longitude":   p.Longitude,
			"isActive":    p.IsActive,
			"companyName": p.CompanyName,
			"company":     gin.H{"id": p.CompanyID, "name": p.CompanyName},
			"protocols":   protocols,
			"ytbsCode":    p.YTBSCode,
			"canSendYtbs": p.CanSendYTBS,
			"createdAt":   p.CreatedAt,
			"updatedAt":   p.UpdatedAt,
			"createdBy":   p.CreatedBy,
			"updatedBy":   p.UpdatedBy,
		})
	}

	if plants == nil {
		plants = []any{}
	}

	response.Success(c, http.StatusOK, plants)
}

func CreatePlant(c *gin.Context) {
	var p models.Plant
	if err := c.ShouldBindJSON(&p); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Eksik veya hatalı tesis verisi: "+err.Error())
		return
	}

	p.ID = uuid.New()
	p.IsActive = true

	// Get creator context
	var creatorID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		creatorID = &uid
	}

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "Plant" (id, "companyId", "plantName", "plantType", latitude, longitude, "isActive", "ytbsCode", "canSendYtbs", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10, $11)
	`, p.ID, p.CompanyID, p.PlantName, p.PlantType, p.Latitude, p.Longitude, p.IsActive, p.YTBSCode, p.CanSendYTBS, creatorID, creatorID)

	if err != nil {
		log.Printf("[DB] Insert Error (Plant): %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Tesis oluşturulurken bir hata oluştu")
		return
	}

	response.Success(c, http.StatusCreated, p)
}
func UpdatePlant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Tesis ID hatalı")
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	var query string
	var args []interface{}
	idx := 1

	if val, ok := body["companyId"]; ok {
		query += fmt.Sprintf("\"companyId\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["plantName"]; ok {
		query += fmt.Sprintf("\"plantName\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["plantType"]; ok {
		query += fmt.Sprintf("\"plantType\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["latitude"]; ok {
		query += fmt.Sprintf("latitude = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["longitude"]; ok {
		query += fmt.Sprintf("longitude = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["isActive"]; ok {
		query += fmt.Sprintf("\"isActive\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["ytbsCode"]; ok {
		query += fmt.Sprintf("\"ytbsCode\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}
	if val, ok := body["canSendYtbs"]; ok {
		query += fmt.Sprintf("\"canSendYtbs\" = $%d, ", idx)
		args = append(args, val)
		idx++
	}

	// Add audit fields
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}
	query += fmt.Sprintf("\"updatedAt\" = NOW(), \"updatedBy\" = $%d, ", idx)
	args = append(args, updaterID)
	idx++

	query = "UPDATE \"Plant\" SET " + strings.TrimSuffix(query, ", ") + " WHERE id = $" + fmt.Sprintf("%d", idx)
	
	args = append(args, id)

	_, err = db.Pool.Exec(context.Background(), query, args...)
	if err != nil {
		log.Printf("[DB] Update Error (Plant): %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Tesis güncellenirken hata: "+err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Tesis başarıyla güncellendi"})
}

func DeletePlant(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Tesis ID hatalı")
		return
	}

	ctx := context.Background()
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	// Önce Tesis'e bağlı tüm protokolleri ve onların alt konfigürasyonlarını silelim
	// Bu, Foreign Key kısıtlamalarını önlemek için gereklidir.
	
	// 1. Protokollerin ID listesini alalım
	var protocolIDs []uuid.UUID
	rows, _ := tx.Query(ctx, `SELECT id FROM "ProtocolConfig" WHERE "plantId" = $1`, id)
	for rows.Next() {
		var pid uuid.UUID
		if err := rows.Scan(&pid); err == nil {
			protocolIDs = append(protocolIDs, pid)
		}
	}
	rows.Close()

	// 2. Alt konfigürasyonları ve cihazları silelim
	for _, pid := range protocolIDs {
		_, _ = tx.Exec(ctx, `DELETE FROM "Device" WHERE "protocolConfigId" = $1`, pid)
		_, _ = tx.Exec(ctx, `DELETE FROM "ModbusConfig" WHERE "protocolId" = $1`, pid)
		_, _ = tx.Exec(ctx, `DELETE FROM "IEC104Config" WHERE "protocolId" = $1`, pid)
	}

	// 3. Protokolleri silelim
	_, err = tx.Exec(ctx, `DELETE FROM "ProtocolConfig" WHERE "plantId" = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Tesis protokolleri silinemedi: "+err.Error())
		return
	}

	// 4. Son olarak Tesisi silelim
	result, err := tx.Exec(ctx, `DELETE FROM "Plant" WHERE id = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Tesis silinirken hata: "+err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Tesis bulunamadı")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Değişiklikler uygulanamadı")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Tesis başarıyla silindi"})
}
