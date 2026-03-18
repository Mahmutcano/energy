package handlers

import (
	"context"
	"log"
	"net/http"

	"energy-scada-platform/internal/api/response"
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
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		var comp Company
		if err := rows.Scan(&comp.ID, &comp.Name, &comp.IsActive); err != nil {
			log.Printf("[DB] Error scanning company: %v", err)
			continue
		}
		companies = append(companies, comp)
	}

	if companies == nil {
		companies = []Company{}
	}

	response.Success(c, http.StatusOK, companies)
}
