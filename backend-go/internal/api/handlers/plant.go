package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetPlants(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT p.id, p.company_id, p."plantName", p."plantType", p.latitude, p.longitude, p."isActive", c.name as company_name
		FROM "Plant" p
		JOIN "CompanyProfile" c ON p.company_id = c.id
	`)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		var p models.Plant
		if err := rows.Scan(&p.ID, &p.CompanyID, &p.PlantName, &p.PlantType, &p.Latitude, &p.Longitude, &p.IsActive, &p.CompanyName); err != nil {
			log.Printf("[DB] Error scanning plant: %v", err)
			continue
		}
		plants = append(plants, p)
	}

	if plants == nil {
		plants = []models.Plant{}
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

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "Plant" (id, company_id, "plantName", "plantType", latitude, longitude, "isActive")
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, p.ID, p.CompanyID, p.PlantName, p.PlantType, p.Latitude, p.Longitude, p.IsActive)

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
		query += fmt.Sprintf("company_id = $%d, ", idx)
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

	if query == "" {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Güncellenecek alan yok")
		return
	}

	query = "UPDATE \"Plant\" SET " + query[:len(query)-2] + " WHERE id = $" + fmt.Sprintf("%d", idx)
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
	rows, _ := tx.Query(ctx, `SELECT id FROM "ProtocolConfig" WHERE plant_id = $1`, id)
	for rows.Next() {
		var pid uuid.UUID
		if err := rows.Scan(&pid); err == nil {
			protocolIDs = append(protocolIDs, pid)
		}
	}
	rows.Close()

	// 2. Alt konfigürasyonları ve cihazları silelim
	for _, pid := range protocolIDs {
		_, _ = tx.Exec(ctx, `DELETE FROM "Device" WHERE protocol_config_id = $1`, pid)
		_, _ = tx.Exec(ctx, `DELETE FROM "ModbusConfig" WHERE protocol_id = $1`, pid)
		_, _ = tx.Exec(ctx, `DELETE FROM "IEC104Config" WHERE protocol_id = $1`, pid)
	}

	// 3. Protokolleri silelim
	_, err = tx.Exec(ctx, `DELETE FROM "ProtocolConfig" WHERE plant_id = $1`, id)
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
