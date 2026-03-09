package handlers

import (
	"context"
	"net/http"

	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"

	"github.com/gin-gonic/gin"
)

func GetPlants(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT p.id, p.company_id, p."plantName", p."plantType", p.latitude, p.longitude, p."isActive", c.name as company_name
		FROM "Plant" p
		JOIN "CompanyProfile" c ON p.company_id = c.id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var plants []models.Plant
	for rows.Next() {
		var p models.Plant
		if err := rows.Scan(&p.ID, &p.CompanyID, &p.PlantName, &p.PlantType, &p.Latitude, &p.Longitude, &p.IsActive, &p.CompanyName); err != nil {
			continue
		}
		plants = append(plants, p)
	}

	c.JSON(http.StatusOK, plants)
}
