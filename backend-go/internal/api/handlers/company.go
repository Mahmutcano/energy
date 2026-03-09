package handlers

import (
	"context"
	"net/http"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Company struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	IsActive bool      `json:"isActive"`
}

func GetCompanies(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, name, "isActive" FROM "CompanyProfile"
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		var comp Company
		if err := rows.Scan(&comp.ID, &comp.Name, &comp.IsActive); err != nil {
			continue
		}
		companies = append(companies, comp)
	}

	c.JSON(http.StatusOK, companies)
}
