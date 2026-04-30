package handlers

import (
	"context"
	"net/http"
	"os"
	"strings"
	"time"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

func init() {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("super-secret-key-123456")
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// For parity with current TS backend (not checking password)
	var id uuid.UUID
	var email, firstName, lastName, adminType string
	err := db.Pool.QueryRow(context.Background(), `
		SELECT id, email, "firstName", "lastName", "adminType" FROM "AppUser" WHERE email = $1
	`, req.Email).Scan(&id, &email, &firstName, &lastName, &adminType)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    id.String(),
		"email": email,
		"role":  adminType,
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Fetch company profile if exists
	var companyID *uuid.UUID
	var companyName *string
	err = db.Pool.QueryRow(context.Background(), `
		SELECT cp.id, cp.name 
		FROM "AppUserProfile" up 
		JOIN "CompanyProfile" cp ON up."companyId" = cp.id 
		WHERE up."userId" = $1
	`, id).Scan(&companyID, &companyName)
	// Ignore err as user might not have a profile yet (initial admin)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":    id,
			"email": email,
			"name":  firstName + " " + lastName,
			"role":  adminType,
		},
		"companyProfile": gin.H{
			"id":   companyID,
			"name": companyName,
		},
	})
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	id := uuid.New()
	nameParts := strings.Split(req.Name, " ")
	firstName := nameParts[0]
	lastName := "User"
	if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "AppUser" (id, email, "firstName", "lastName", "adminType", "userCode", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, 'NORMAL_USER', $5, NOW(), NOW())
	`, id, req.Email, firstName, lastName, uuid.New().String()[:8])

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Registration failed: " + err.Error()})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    id.String(),
		"email": req.Email,
		"role":  "NORMAL_USER",
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(jwtSecret)

	c.JSON(http.StatusCreated, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":    id,
			"email": req.Email,
			"name":  req.Name,
			"role":  "NORMAL_USER",
		},
	})
}
