package handlers

import (
	"context"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func getUserCompanyID(c *gin.Context) (*uuid.UUID, string) {
	role, _ := c.Get("user_role")
	roleStr := ""
	if role != nil {
		roleStr = role.(string)
	}

	if roleStr == "SUPER_ADMIN" {
		return nil, roleStr
	}

	userID, ok := c.Get("user_id")
	if !ok || userID == nil {
		return nil, roleStr
	}

	var companyID uuid.UUID
	err := db.Pool.QueryRow(context.Background(), `SELECT "companyId" FROM "AppUserProfile" WHERE "userId" = $1`, userID).Scan(&companyID)
	if err != nil {
		return nil, roleStr
	}
	return &companyID, roleStr
}
