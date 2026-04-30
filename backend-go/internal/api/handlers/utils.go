package handlers

import (
	"context"
	"log"
	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AccessContext struct {
	UserID    uuid.UUID
	Role      string
	CompanyID *uuid.UUID
	PlantIDs  []uuid.UUID
	DeviceIDs []uuid.UUID
}

func getAccessContext(c *gin.Context) AccessContext {
	role, _ := c.Get("user_role")
	roleStr := ""
	if role != nil {
		roleStr = role.(string)
	}

	uidStr, _ := c.Get("user_id")
	var uid uuid.UUID
	if uidStr != nil {
		uid, _ = uuid.Parse(uidStr.(string))
	}

	ctx := AccessContext{
		UserID: uid,
		Role:   roleStr,
	}

	if roleStr == "SUPER_ADMIN" {
		return ctx
	}

	rows, err := db.Pool.Query(context.Background(), `
		SELECT "companyId", "plantId", "deviceId" 
		FROM "AppUserProfile" 
		WHERE "userId" = $1 AND "isActive" = true
	`, uid)

	if err != nil {
		log.Printf("[AUTH] Error fetching access context for user %v: %v", uid, err)
		return ctx
	}
	defer rows.Close()

	for rows.Next() {
		var cid uuid.UUID
		var pid, did *uuid.UUID
		if err := rows.Scan(&cid, &pid, &did); err != nil {
			continue
		}
		log.Printf("[AUTH] Found profile for user %v: Company=%v, Plant=%v, Device=%v", uid, cid, pid, did)
		if ctx.CompanyID == nil {
			ctx.CompanyID = &cid
		}
		if pid != nil {
			ctx.PlantIDs = append(ctx.PlantIDs, *pid)
		}
		if did != nil {
			ctx.DeviceIDs = append(ctx.DeviceIDs, *did)
		}
	}

	if ctx.CompanyID == nil && roleStr != "SUPER_ADMIN" {
		log.Printf("[AUTH] User %v has NO company assigned!", uid)
	}

	return ctx
}

func getUserCompanyID(c *gin.Context) (*uuid.UUID, string) {
	ctx := getAccessContext(c)
	return ctx.CompanyID, ctx.Role
}
