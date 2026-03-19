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
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Address        *string   `json:"address"`
	Phone          *string   `json:"phone"`
	Email          *string   `json:"email"`
	Representative *string   `json:"representative"`
	TaxOffice      *string   `json:"taxOffice"`
	TaxNumber      *int      `json:"taxNumber"`
	IsActive       bool      `json:"isActive"`
}

func GetCompanies(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT id, name, address, phone, email, representative, "taxOffice", "taxNumber", "isActive" 
		FROM "CompanyProfile"
		ORDER BY name ASC
	`)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		var comp Company
		if err := rows.Scan(
			&comp.ID, &comp.Name, &comp.Address, &comp.Phone, &comp.Email,
			&comp.Representative, &comp.TaxOffice, &comp.TaxNumber, &comp.IsActive,
		); err != nil {
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

func CreateCompany(c *gin.Context) {
	var req Company
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	id := uuid.New()
	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "CompanyProfile" (id, name, address, phone, email, representative, "taxOffice", "taxNumber", "isActive", "createdAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
	`, id, req.Name, req.Address, req.Phone, req.Email, req.Representative, req.TaxOffice, req.TaxNumber, req.IsActive)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	req.ID = id
	response.Success(c, http.StatusCreated, req)
}

func UpdateCompany(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "İleç ID hatalı")
		return
	}

	var req Company
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	_, err = db.Pool.Exec(context.Background(), `
		UPDATE "CompanyProfile" SET 
			name = $1, address = $2, phone = $3, email = $4, 
			representative = $5, "taxOffice" = $6, "taxNumber" = $7, "isActive" = $8
		WHERE id = $9
	`, req.Name, req.Address, req.Phone, req.Email, req.Representative, req.TaxOffice, req.TaxNumber, req.IsActive, id)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Firma güncellendi"})
}

func DeleteCompany(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Firma ID hatalı")
		return
	}

	_, err = db.Pool.Exec(context.Background(), `DELETE FROM "CompanyProfile" WHERE id = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Bu firmayı silmek için önce ilgili santralleri silmelisiniz.")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Firma silindi"})
}
