package handlers

import (
	"context"
	"log"
	"net/http"
	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type CommProtocol struct {
	ID           uuid.UUID  `json:"id"`
	ConfigName   string     `json:"configName"`
	ProtocolType string     `json:"protocolType"`
	PlantID      uuid.UUID  `json:"plantId"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	CreatedBy    *uuid.UUID `json:"createdBy"`
	UpdatedBy    *uuid.UUID `json:"updatedBy"`
	Plant        *struct {
		PlantName string `json:"plantName"`
	} `json:"plant,omitempty"`
}

func GetCommProtocols(c *gin.Context) {
	companyID, role := getUserCompanyID(c)
	var rows pgx.Rows
	var err error

	if role == "SUPER_ADMIN" {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT 
				pc.id, pc."configName", pc."protocolType", pc."plantId", p."plantName",
				mc."ipAddress", mc.port, mc."slaveId", mc.timeout, mc."retryCount",
				ic."ipAddress", ic.port, ic."asduAddr", ic.t0, ic.t1, ic.t2, ic.t3, ic.k, ic.w,
				(SELECT COUNT(*) FROM "Device" d WHERE d."protocolConfigId" = pc.id) as device_count,
				pc."createdAt", pc."updatedAt", pc."createdBy", pc."updatedBy"
			FROM "ProtocolConfig" pc
			LEFT JOIN "Plant" p ON pc."plantId" = p.id
			LEFT JOIN "ModbusConfig" mc ON pc.id = mc."protocolId"
			LEFT JOIN "IEC104Config" ic ON pc.id = ic."protocolId"
		`)
	} else if companyID != nil {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT 
				pc.id, pc."configName", pc."protocolType", pc."plantId", p."plantName",
				mc."ipAddress", mc.port, mc."slaveId", mc.timeout, mc."retryCount",
				ic."ipAddress", ic.port, ic."asduAddr", ic.t0, ic.t1, ic.t2, ic.t3, ic.k, ic.w,
				(SELECT COUNT(*) FROM "Device" d WHERE d."protocolConfigId" = pc.id) as device_count,
				pc."createdAt", pc."updatedAt", pc."createdBy", pc."updatedBy"
			FROM "ProtocolConfig" pc
			JOIN "Plant" p ON pc."plantId" = p.id
			LEFT JOIN "ModbusConfig" mc ON pc.id = mc."protocolId"
			LEFT JOIN "IEC104Config" ic ON pc.id = ic."protocolId"
			WHERE p."companyId" = $1
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
		var p CommProtocol
		var plantName *string
		var mIP, iIP *string
		var mPort, mSlaveId, mTimeout, mRetryCount *int
		var iPort, iAsdu, iT0, iT1, iT2, iT3, iK, iW *int
		var deviceCount int
		err := rows.Scan(
			&p.ID, &p.ConfigName, &p.ProtocolType, &p.PlantID, &plantName,
			&mIP, &mPort, &mSlaveId, &mTimeout, &mRetryCount,
			&iIP, &iPort, &iAsdu, &iT0, &iT1, &iT2, &iT3, &iK, &iW,
			&deviceCount, &p.CreatedAt, &p.UpdatedAt, &p.CreatedBy, &p.UpdatedBy,
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
			"createdAt":    p.CreatedAt,
			"updatedAt":    p.UpdatedAt,
			"createdBy":    p.CreatedBy,
			"updatedBy":    p.UpdatedBy,
			"plant":        gin.H{"plantName": plantName},
			"_count":       gin.H{"devices": deviceCount},
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

	// Get creator context
	var creatorID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		creatorID = &uid
	}

	protocolID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO "ProtocolConfig" (id, "plantId", "protocolType", "configName", "isActive", "createdAt", "updatedAt", "createdBy", "updatedBy")
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7)
	`, protocolID, req.PlantID, req.ProtocolType, req.ConfigName, true, creatorID, creatorID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Ana konfigürasyon kaydedilemedi")
		return
	}

	if req.ProtocolType == "MODBUS" && req.ModbusConfig != nil {
		mc := req.ModbusConfig
		_, err = tx.Exec(ctx, `
			INSERT INTO "ModbusConfig" (id, "protocolId", "ipAddress", port, "slaveId", timeout, "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.New(), protocolID, mc.IPAddress, mc.Port, mc.SlaveID, mc.Timeout, mc.RetryCount)
	} else if req.ProtocolType == "IEC104" && req.IEC104Config != nil {
		ic := req.IEC104Config
		_, err = tx.Exec(ctx, `
			INSERT INTO "IEC104Config" (id, "protocolId", "ipAddress", port, "asduAddr", t0, t1, t2, t3, k, w)
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

	// Get updater context
	var updaterID *uuid.UUID
	uidStr, _ := c.Get("user_id")
	if uidStr != nil {
		uid, _ := uuid.Parse(uidStr.(string))
		updaterID = &uid
	}

	result, err := tx.Exec(ctx, `
		UPDATE "ProtocolConfig" 
		SET "configName" = $1, "protocolType" = $2, "plantId" = $3, "updatedAt" = NOW(), "updatedBy" = $4
		WHERE id = $5
	`, req.ConfigName, req.ProtocolType, req.PlantID, updaterID, protocolID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Konfigürasyon bulunamadı")
		return
	}

	// Remove existing sub-configs
	_, _ = tx.Exec(ctx, `DELETE FROM "ModbusConfig" WHERE "protocolId" = $1`, protocolID)
	_, _ = tx.Exec(ctx, `DELETE FROM "IEC104Config" WHERE "protocolId" = $1`, protocolID)

	if req.ProtocolType == "MODBUS" && req.ModbusConfig != nil {
		mc := req.ModbusConfig
		_, err = tx.Exec(ctx, `
			INSERT INTO "ModbusConfig" (id, "protocolId", "ipAddress", port, "slaveId", timeout, "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, uuid.New(), protocolID, mc.IPAddress, mc.Port, mc.SlaveID, mc.Timeout, mc.RetryCount)
	} else if req.ProtocolType == "IEC104" && req.IEC104Config != nil {
		ic := req.IEC104Config
		_, err = tx.Exec(ctx, `
			INSERT INTO "IEC104Config" (id, "protocolId", "ipAddress", port, "asduAddr", t0, t1, t2, t3, k, w)
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
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "İşlem başlatılamadı")
		return
	}
	defer tx.Rollback(ctx)

	// Önce alt konfigürasyonları ve cihazları silelim
	_, _ = tx.Exec(ctx, `DELETE FROM "Device" WHERE "protocolConfigId" = $1`, protocolID)
	_, _ = tx.Exec(ctx, `DELETE FROM "ModbusConfig" WHERE "protocolId" = $1`, protocolID)
	_, _ = tx.Exec(ctx, `DELETE FROM "IEC104Config" WHERE "protocolId" = $1`, protocolID)

	// Şimdi ana konfigürasyonu silelim
	result, err := tx.Exec(ctx, `DELETE FROM "ProtocolConfig" WHERE id = $1`, protocolID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Silme hatası: "+err.Error())
		return
	}

	if result.RowsAffected() == 0 {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Kayıt bulunamadı")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Değişiklikler uygulanamadı")
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Protokol başarıyla silindi"})
}
