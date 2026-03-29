package handlers

import (
	"context"
	"log"
	"net/http"

	"time"
	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Company struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Address        *string    `json:"address"`
	Phone          *string    `json:"phone"`
	Email          *string    `json:"email"`
	Representative *string    `json:"representative"`
	TaxOffice      *string    `json:"taxOffice"`
	TaxNumber      *int       `json:"taxNumber"`
	IsActive       bool       `json:"isActive"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      *time.Time `json:"updatedAt"`
	CreatedBy      *uuid.UUID `json:"createdBy"`
	UpdatedBy      *uuid.UUID `json:"updatedBy"`
}

func GetCompanies(c *gin.Context) {
	companyID, role := getUserCompanyID(c)

	var rows pgx.Rows
	var err error
	
	if role == "SUPER_ADMIN" {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT id, name, address, phone, email, representative, "taxOffice", "taxNumber", "isActive", 
			       "createdAt", "updatedAt", "createdBy", "updatedBy",
			       (SELECT COUNT(*) FROM "Plant" p WHERE p."companyId" = cp.id) as plant_count,
			       (SELECT COUNT(*) FROM "AppUserProfile" up WHERE up."companyId" = cp.id) as user_count
			FROM "CompanyProfile" cp
			ORDER BY "createdAt" DESC
		`)
	} else if companyID != nil {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT id, name, address, phone, email, representative, "taxOffice", "taxNumber", "isActive", 
			       "createdAt", "updatedAt", "createdBy", "updatedBy",
			       (SELECT COUNT(*) FROM "Plant" p WHERE p."companyId" = cp.id) as plant_count,
			       (SELECT COUNT(*) FROM "AppUserProfile" up WHERE up."companyId" = cp.id) as user_count
			FROM "CompanyProfile" cp
			WHERE id = $1
			ORDER BY "createdAt" DESC
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

	var results []any
	for rows.Next() {
		var comp Company
		var plantCount, userCount int
		if err := rows.Scan(
			&comp.ID, &comp.Name, &comp.Address, &comp.Phone, &comp.Email,
			&comp.Representative, &comp.TaxOffice, &comp.TaxNumber, &comp.IsActive,
			&comp.CreatedAt, &comp.UpdatedAt, &comp.CreatedBy, &comp.UpdatedBy,
			&plantCount, &userCount,
		); err != nil {
			log.Printf("[DB] Error scanning company: %v", err)
			continue
		}

		results = append(results, gin.H{
			"id":             comp.ID,
			"name":           comp.Name,
			"address":        comp.Address,
			"phone":          comp.Phone,
			"email":          comp.Email,
			"representative": comp.Representative,
			"taxOffice":      comp.TaxOffice,
			"taxNumber":      comp.TaxNumber,
			"isActive":       comp.IsActive,
			"createdAt":      comp.CreatedAt,
			"updatedAt":      comp.UpdatedAt,
			"createdBy":      comp.CreatedBy,
			"updatedBy":      comp.UpdatedBy,
			"plantCount":     plantCount,
			"userCount":      userCount,
		})
	}

	if results == nil {
		results = []any{}
	}

	response.Success(c, http.StatusOK, results)
}

func CreateCompany(c *gin.Context) {
	var req Company
	if err := c.ShouldBindJSON(&req); err != nil {
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
		INSERT INTO "CompanyProfile" (id, name, address, phone, email, representative, "taxOffice", "taxNumber", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NULL, $10, NULL)
	`, id, req.Name, req.Address, req.Phone, req.Email, req.Representative, req.TaxOffice, req.TaxNumber, req.IsActive, creatorID)

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

	// Get updater
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}

	_, err = db.Pool.Exec(context.Background(), `
		UPDATE "CompanyProfile" SET 
			name = $1, address = $2, phone = $3, email = $4, 
			representative = $5, "taxOffice" = $6, "taxNumber" = $7, "isActive" = $8,
			"updatedAt" = NOW(), "updatedBy" = $9
		WHERE id = $10
	`, req.Name, req.Address, req.Phone, req.Email, req.Representative, req.TaxOffice, req.TaxNumber, req.IsActive, updaterID, id)

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

	// Clean up related records in correct order
	// 1. Delete user-company links
	_, _ = db.Pool.Exec(context.Background(), `DELETE FROM "AppUserProfile" WHERE "companyId" = $1`, id)

	// 2. Delete downstream from plants: alarms -> devices -> protocols -> plants
	_, _ = db.Pool.Exec(context.Background(), `
		DELETE FROM "CommunicationAlarm" WHERE "deviceId" IN (
			SELECT d.id FROM "Device" d
			JOIN "ProtocolConfig" pc ON d."protocolConfigId" = pc.id
			JOIN "Plant" p ON pc."plantId" = p.id
			WHERE p."companyId" = $1
		)
	`, id)
	_, _ = db.Pool.Exec(context.Background(), `
		DELETE FROM "Device" WHERE "protocolConfigId" IN (
			SELECT pc.id FROM "ProtocolConfig" pc
			JOIN "Plant" p ON pc."plantId" = p.id
			WHERE p."companyId" = $1
		)
	`, id)
	_, _ = db.Pool.Exec(context.Background(), `
		DELETE FROM "ModbusConfig" WHERE "protocolId" IN (
			SELECT pc.id FROM "ProtocolConfig" pc
			JOIN "Plant" p ON pc."plantId" = p.id WHERE p."companyId" = $1
		)
	`, id)
	_, _ = db.Pool.Exec(context.Background(), `
		DELETE FROM "IEC104Config" WHERE "protocolId" IN (
			SELECT pc.id FROM "ProtocolConfig" pc
			JOIN "Plant" p ON pc."plantId" = p.id WHERE p."companyId" = $1
		)
	`, id)
	_, _ = db.Pool.Exec(context.Background(), `
		DELETE FROM "ProtocolConfig" WHERE "plantId" IN (
			SELECT id FROM "Plant" WHERE "companyId" = $1
		)
	`, id)
	_, _ = db.Pool.Exec(context.Background(), `DELETE FROM "Plant" WHERE "companyId" = $1`, id)

	// 3. Finally delete the company
	_, err = db.Pool.Exec(context.Background(), `DELETE FROM "CompanyProfile" WHERE id = $1`, id)
	if err != nil {
		log.Printf("[DB] Error deleting company %s: %v", id, err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Firma silindi"})
}
