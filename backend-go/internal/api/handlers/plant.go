package handlers

import (
	"context"
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
