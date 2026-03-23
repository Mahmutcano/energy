package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type User struct {
	ID               uuid.UUID `json:"id"`
	Email            string    `json:"email"`
	Name             string    `json:"name"`
	Role             string    `json:"role"`
	CompanyProfileId *uuid.UUID `json:"companyProfileId"`
	CompanyProfile   *gin.H     `json:"companyProfile"`
}

func GetUsers(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT u.id, u.email, u."firstName", u."lastName", u."adminType", up."company_id", cp.name
		FROM "AppUser" u
		LEFT JOIN "AppUserProfile" up ON u.id = up.user_id
		LEFT JOIN "CompanyProfile" cp ON up.company_id = cp.id
		ORDER BY u."firstName" ASC
	`)
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
		if err := rows.Scan(&u.ID, &u.Email, &firstName, &lastName, &u.Role, &u.CompanyProfileId, &companyName); err != nil {
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

	_, err = tx.Exec(context.Background(), `
		INSERT INTO "AppUser" (id, email, "firstName", "lastName", "adminType", "userCode")
		VALUES ($1, $2, $3, $4, $5, $6)
	`, id, body.Email, firstName, lastName, body.Role, userCode)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if body.CompanyProfileId != nil {
		_, err = tx.Exec(context.Background(), `
			INSERT INTO "AppUserProfile" (id, user_id, company_id, "permissionLevel")
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

	_, err = tx.Exec(context.Background(), `DELETE FROM "AppUserProfile" WHERE user_id = $1`, id)
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
