package handlers

import (
	"context"
	"net/http"

	"energy-scada-platform/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CommProtocol struct {
	ID           uuid.UUID `json:"id"`
	ConfigName   string    `json:"configName"`
	ProtocolType string    `json:"protocolType"`
	PlantID      uuid.UUID `json:"plantId"`
	Plant        *struct {
		PlantName string `json:"plantName"`
	} `json:"plant,omitempty"`
}

func GetCommProtocols(c *gin.Context) {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT pc.id, pc."configName", pc."protocolType", pc.plant_id, p."plantName"
		FROM "ProtocolConfig" pc
		LEFT JOIN "Plant" p ON pc.plant_id = p.id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var protocols []CommProtocol
	for rows.Next() {
		var p CommProtocol
		var plantName *string
		if err := rows.Scan(&p.ID, &p.ConfigName, &p.ProtocolType, &p.PlantID, &plantName); err != nil {
			continue
		}
		if plantName != nil {
			p.Plant = &struct {
				PlantName string `json:"plantName"`
			}{PlantName: *plantName}
		}
		protocols = append(protocols, p)
	}

	c.JSON(http.StatusOK, protocols)
}
