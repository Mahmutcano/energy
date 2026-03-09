package handlers

import (
	"context"
	"net/http"
	"os"
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

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":    id,
			"email": email,
			"name":  firstName + " " + lastName,
			"role":  adminType,
		},
	})
}
