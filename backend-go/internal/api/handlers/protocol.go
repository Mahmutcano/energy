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
		SELECT 
			pc.id, pc."configName", pc."protocolType", pc.plant_id, p."plantName",
			mc."ipAddress", mc.port, mc."slaveId", mc.timeout, mc."retryCount",
			ic."ipAddress", ic.port, ic."asduAddr", ic.t0, ic.t1, ic.t2, ic.t3, ic.k, ic.w
		FROM "ProtocolConfig" pc
		LEFT JOIN "Plant" p ON pc.plant_id = p.id
		LEFT JOIN "ModbusConfig" mc ON pc.id = mc.protocol_id
		LEFT JOIN "IEC104Config" ic ON pc.id = ic.protocol_id
	`)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var results []any
	for rows.Next() {
		var p CommProtocol
		var plantName *string
		var mIP, iIP *string
		var mPort, mSlaveId, mTimeout, mRetryCount *int
		var iPort, iAsdu, iT0, iT1, iT2, iT3, iK, iW *int

		err := rows.Scan(
			&p.ID, &p.ConfigName, &p.ProtocolType, &p.PlantID, &plantName,
			&mIP, &mPort, &mSlaveId, &mTimeout, &mRetryCount,
			&iIP, &iPort, &iAsdu, &iT0, &iT1, &iT2, &iT3, &iK, &iW,
		)
		if err != nil {
			log.Printf("[DB] Error scanning comm protocol: %v", err)
			continue
		}

		res := gin.H{
			"id":           p.ID,
			"configName":   p.ConfigName,
			"protocolType": p.ProtocolType,
			"plantId":      p.PlantID,
			"plant":        gin.H{"plantName": plantName},
		}

		if p.ProtocolType == "MODBUS" && mIP != nil {
			res["modbusConfig"] = gin.H{
				"ipAddress":  *mIP,
				"port":       *mPort,
				"slaveId":    *mSlaveId,
				"timeout":    *mTimeout,
				"retryCount": *mRetryCount,
			}
		} else if p.ProtocolType == "IEC104" && iIP != nil {
			res["iec104Config"] = gin.H{
				"ipAddress": *iIP,
				"port":      *iPort,
				"asduAddr":  *iAsdu,
				"t0":        *iT0,
				"t1":        *iT1,
				"t2":        *iT2,
				"t3":        *iT3,
				"k":         *iK,
				"w":         *iW,
			}
		}

		results = append(results, res)
	}

	response.Success(c, http.StatusOK, results)
}

func CreateCommProtocol(c *gin.Context) {
	var req struct {
		ConfigName   string    `json:"configName" binding:"required"`
		ProtocolType string    `json:"protocolType" binding:"required"`
		PlantID      uuid.UUID `json:"plantId" binding:"required"`
		ModbusConfig *struct {
			IPAddress  string `json:"ipAddress" binding:"required"`
			Port       int    `json:"port" binding:"required"`
			SlaveID    int    `json:"slaveId"`
			Timeout    int    `json:"timeout"`
			RetryCount int    `json:"retryCount"`
		} `json:"modbusConfig"`
		IEC104Config *struct {
			IPAddress string `json:"ipAddress" binding:"required"`
			Port      int    `json:"port" binding:"required"`
			AsduAddr  int    `json:"asduAddr" binding:"required"`
			T0        int    `json:"t0"`
			T1        int    `json:"t1"`
			T2        int    `json:"t2"`
			T3        int    `json:"t3"`
			K         int    `json:"k"`
			W         int    `json:"w"`
		} `json:"iec104Config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Eksik veya hatalı parametre: "+err.Error())
		return
	}

	ctx := context.Background()
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	protocolID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO "ProtocolConfig" (id, plant_id, "protocolType", "configName", "isActive")
		VALUES ($1, $2, $3, $4, $5)
	`, protocolID, req.PlantID, req.ProtocolType, req.ConfigName, true)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Ana konfigürasyon kaydedilemedi")
		return
	}

	if req.ProtocolType == "MODBUS" && req.ModbusConfig != nil {
		mc := req.ModbusConfig
		_, err = tx.Exec(ctx, `
			INSERT INTO "ModbusConfig" (id, protocol_id, "ipAddress", port, "slaveId", timeout, "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.New(), protocolID, mc.IPAddress, mc.Port, mc.SlaveID, mc.Timeout, mc.RetryCount)
	} else if req.ProtocolType == "IEC104" && req.IEC104Config != nil {
		ic := req.IEC104Config
		_, err = tx.Exec(ctx, `
			INSERT INTO "IEC104Config" (id, protocol_id, "ipAddress", port, "asduAddr", t0, t1, t2, t3, k, w)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, uuid.New(), protocolID, ic.IPAddress, ic.Port, ic.AsduAddr, ic.T0, ic.T1, ic.T2, ic.T3, ic.K, ic.W)
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Alt konfigürasyon kaydedilemedi: "+err.Error())
		return
	}

	if err := tx.Commit(ctx); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Değişiklikler uygulanamadı")
		return
	}

	response.Success(c, http.StatusCreated, gin.H{"id": protocolID, "message": "Protokol başarıyla oluşturuldu"})
}

func UpdateCommProtocol(c *gin.Context) {
	idStr := c.Param("id")
	protocolID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID")
		return
	}

	var req struct {
		ConfigName   string    `json:"configName" binding:"required"`
		ProtocolType string    `json:"protocolType" binding:"required"`
		PlantID      uuid.UUID `json:"plantId" binding:"required"`
		ModbusConfig *struct {
			IPAddress  string `json:"ipAddress" binding:"required"`
			Port       int    `json:"port" binding:"required"`
			SlaveID    int    `json:"slaveId"`
			Timeout    int    `json:"timeout"`
			RetryCount int    `json:"retryCount"`
		} `json:"modbusConfig"`
		IEC104Config *struct {
			IPAddress string `json:"ipAddress" binding:"required"`
			Port      int    `json:"port" binding:"required"`
			AsduAddr  int    `json:"asduAddr" binding:"required"`
			T0        int    `json:"t0"`
			T1        int    `json:"t1"`
			T2        int    `json:"t2"`
			T3        int    `json:"t3"`
			K         int    `json:"k"`
			W         int    `json:"w"`
		} `json:"iec104Config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Hatalı veri: "+err.Error())
		return
	}

	ctx := context.Background()
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "İşlem hatası")
		return
	}
	defer tx.Rollback(ctx)

	result, err := tx.Exec(ctx, `
		UPDATE "ProtocolConfig" 
		SET "configName" = $1, "protocolType" = $2, plant_id = $3
		WHERE id = $4
	`, req.ConfigName, req.ProtocolType, req.PlantID, protocolID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Konfigürasyon bulunamadı")
		return
	}

	// Remove existing sub-configs
	_, _ = tx.Exec(ctx, `DELETE FROM "ModbusConfig" WHERE protocol_id = $1`, protocolID)
	_, _ = tx.Exec(ctx, `DELETE FROM "IEC104Config" WHERE protocol_id = $1`, protocolID)

	if req.ProtocolType == "MODBUS" && req.ModbusConfig != nil {
		mc := req.ModbusConfig
		_, err = tx.Exec(ctx, `
			INSERT INTO "ModbusConfig" (id, protocol_id, "ipAddress", port, "slaveId", timeout, "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.New(), protocolID, mc.IPAddress, mc.Port, mc.SlaveID, mc.Timeout, mc.RetryCount)
	} else if req.ProtocolType == "IEC104" && req.IEC104Config != nil {
		ic := req.IEC104Config
		_, err = tx.Exec(ctx, `
			INSERT INTO "IEC104Config" (id, protocol_id, "ipAddress", port, "asduAddr", t0, t1, t2, t3, k, w)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, uuid.New(), protocolID, ic.IPAddress, ic.Port, ic.AsduAddr, ic.T0, ic.T1, ic.T2, ic.T3, ic.K, ic.W)
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if err := tx.Commit(ctx); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Kayıt hatası")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Protokol başarıyla güncellendi"})
}

func DeleteCommProtocol(c *gin.Context) {
	idStr := c.Param("id")
	protocolID, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID")
		return
	}

	ctx := context.Background()
	result, err := db.Pool.Exec(ctx, `DELETE FROM "ProtocolConfig" WHERE id = $1`, protocolID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Silme hatası")
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Kayıt bulunamadı")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Protokol başarıyla silindi"})
}
