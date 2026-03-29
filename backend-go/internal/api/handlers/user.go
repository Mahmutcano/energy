package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type User struct {
	ID               uuid.UUID  `json:"id"`
	Email            string     `json:"email"`
	Name             string     `json:"name"`
	Role             string     `json:"role"`
	CompanyProfileId *uuid.UUID `json:"companyProfileId"`
	CompanyProfile   *gin.H     `json:"companyProfile"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        *time.Time `json:"updatedAt"`
	CreatedBy        *uuid.UUID `json:"createdBy"`
	UpdatedBy        *uuid.UUID `json:"updatedBy"`
}

func GetUsers(c *gin.Context) {
	companyID, role := getUserCompanyID(c)
	var rows pgx.Rows
	var err error

	if role == "SUPER_ADMIN" {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT u.id, u.email, u."firstName", u."lastName", u."adminType", up."companyId", cp.name,
			       u."createdAt", u."updatedAt", u."createdBy", u."updatedBy"
			FROM "AppUser" u
			LEFT JOIN "AppUserProfile" up ON u.id = up."userId"
			LEFT JOIN "CompanyProfile" cp ON up."companyId" = cp.id
			ORDER BY u."createdAt" DESC
		`)
	} else if companyID != nil {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT u.id, u.email, u."firstName", u."lastName", u."adminType", up."companyId", cp.name,
			       u."createdAt", u."updatedAt", u."createdBy", u."updatedBy"
			FROM "AppUser" u
			JOIN "AppUserProfile" up ON u.id = up."userId"
			JOIN "CompanyProfile" cp ON up."companyId" = cp.id
			WHERE up."companyId" = $1
			ORDER BY u."createdAt" DESC
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

	var users []User
	for rows.Next() {
		var u User
		var firstName, lastName string
		var companyName *string
		if err := rows.Scan(&u.ID, &u.Email, &firstName, &lastName, &u.Role, &u.CompanyProfileId, &companyName, &u.CreatedAt, &u.UpdatedAt, &u.CreatedBy, &u.UpdatedBy); err != nil {
			log.Printf("[DB] Error scanning user: %v", err)
			continue
		}
		u.Name = strings.TrimSpace(firstName + " " + lastName)
		if companyName != nil {
			u.CompanyProfile = &gin.H{"id": u.CompanyProfileId, "name": *companyName}
		}
		users = append(users, u)
	}

	if users == nil {
		users = []User{}
	}

	response.Success(c, http.StatusOK, users)
}

func CreateUser(c *gin.Context) {
	var body struct {
		Email            string `json:"email" binding:"required"`
		Password         string `json:"password"`
		Name             string `json:"name" binding:"required"`
		Role             string `json:"role" binding:"required"`
		CompanyProfileId *uuid.UUID `json:"companyProfileId"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	nameParts := strings.Split(body.Name, " ")
	firstName := nameParts[0]
	lastName := "User"
	if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	id := uuid.New()
	userCode := uuid.New().String()[:8]

	tx, err := db.Pool.Begin(context.Background())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer tx.Rollback(context.Background())

	// Get creator from context
	var creatorID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		creatorID = &uid
	}

	_, err = tx.Exec(context.Background(), `
		INSERT INTO "AppUser" (id, email, "firstName", "lastName", "adminType", "userCode", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL, $7, NULL)
	`, id, body.Email, firstName, lastName, body.Role, userCode, creatorID)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if body.CompanyProfileId != nil {
		_, err = tx.Exec(context.Background(), `
			INSERT INTO "AppUserProfile" (id, "userId", "companyId", "permissionLevel")
			VALUES ($1, $2, $3, 'READ')
		`, uuid.New(), id, *body.CompanyProfileId)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
			return
		}
	}

	if err := tx.Commit(context.Background()); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, gin.H{"id": id, "message": "Kullanıcı oluşturuldu"})
}

func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Kullanıcı ID hatalı")
		return
	}

	var body struct {
		Name             string     `json:"name"`
		Email            string     `json:"email"`
		Role             string     `json:"role"`
		CompanyProfileId *string    `json:"companyProfileId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	// Get updater from context
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}

	tx, err := db.Pool.Begin(context.Background())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer tx.Rollback(context.Background())

	// Update name
	nameParts := strings.Split(body.Name, " ")
	firstName := nameParts[0]
	lastName := ""
	if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	_, err = tx.Exec(context.Background(), `
		UPDATE "AppUser" SET "firstName" = $1, "lastName" = $2, email = $3, "adminType" = $4, 
		       "updatedAt" = NOW(), "updatedBy" = $5
		WHERE id = $6
	`, firstName, lastName, body.Email, body.Role, updaterID, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	// Handle company assignment
	_, _ = tx.Exec(context.Background(), `DELETE FROM "AppUserProfile" WHERE "userId" = $1`, id)

	if body.CompanyProfileId != nil && *body.CompanyProfileId != "" {
		companyUUID, err := uuid.Parse(*body.CompanyProfileId)
		if err == nil {
			_, err = tx.Exec(context.Background(), `
				INSERT INTO "AppUserProfile" (id, "userId", "companyId", "permissionLevel")
				VALUES ($1, $2, $3, 'READ')
			`, uuid.New(), id, companyUUID)
			if err != nil {
				log.Printf("[DB] Error inserting user profile: %v", err)
			}
		}
	}

	if err := tx.Commit(context.Background()); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Kullanıcı güncellendi"})
}

func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Kullanıcı ID hatalı")
		return
	}

	tx, err := db.Pool.Begin(context.Background())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer tx.Rollback(context.Background())

	_, err = tx.Exec(context.Background(), `DELETE FROM "AppUserProfile" WHERE "userId" = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	_, err = tx.Exec(context.Background(), `DELETE FROM "AppUser" WHERE id = $1`, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Kullanıcı silindi"})
}
