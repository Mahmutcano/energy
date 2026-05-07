package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"energy-scada-platform/internal/api/response"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/services"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func GetImportedIds(c *gin.Context) {
	companyID := c.Query("companyId")
	
	var rows pgx.Rows
	var err error

	if companyID != "" {
		cid, _ := uuid.Parse(companyID)
		rows, err = db.Pool.Query(context.Background(), `
			SELECT yp."ytbsId" 
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
			WHERE p."companyId" = $1
		`, cid)
	} else {
		rows, err = db.Pool.Query(context.Background(), `SELECT "ytbsId" FROM "YtbsPlant"`)
	}

	if err != nil {
		log.Printf("[YTBS] Error fetching imported IDs: %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			continue
		}
		ids = append(ids, id)
	}
	if ids == nil {
		ids = []int{}
	}
	log.Printf("[YTBS] Returning %d imported IDs", len(ids))
	response.Success(c, http.StatusOK, ids)
}

func GetIntegratedPlants(c *gin.Context) {
	companyID := c.Query("companyId")
	var rows pgx.Rows
	var err error

	if companyID != "" {
		cid, _ := uuid.Parse(companyID)
		rows, err = db.Pool.Query(context.Background(), `
			SELECT yp.id, yp."plantId", yp."ytbsId", yp.license_no, p."plantName", p."ytbsCode"
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
			WHERE p."companyId" = $1
		`, cid)
	} else {
		rows, err = db.Pool.Query(context.Background(), `
			SELECT yp.id, yp."plantId", yp."ytbsId", yp.license_no, p."plantName", p."ytbsCode"
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
		`)
	}

	if err != nil {
		log.Printf("[YTBS] GetIntegratedPlants SQL error: %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var plants []gin.H
	for rows.Next() {
		var id, plantId uuid.UUID
		var ytbsId int
		var licenseNo, plantName, ytbsCode *string
		if err := rows.Scan(&id, &plantId, &ytbsId, &licenseNo, &plantName, &ytbsCode); err != nil {
			log.Printf("[YTBS] GetIntegratedPlants SCAN error: %v", err)
			continue
		}
		plants = append(plants, gin.H{
			"id":         plantId, 
			"ytbsId":     ytbsId,
			"ytbsCode":   derefString(ytbsCode),
			"plantName":  derefString(plantName),
			"licenseNo":  derefString(licenseNo),
		})
	}
	if plants == nil {
		plants = []gin.H{}
	}
	response.Success(c, http.StatusOK, plants)
}

func GetProductionLogs(c *gin.Context) {
	logType := c.Query("type")
	companyID := c.Query("companyId")
	plantID := c.Query("plantId")
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	tableName := "YtbsInstantProduction"
	if logType == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	var query strings.Builder
	query.WriteString(fmt.Sprintf(`SELECT id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", %s, %s, "isSent", "lastAttemptAt", "retryCount", "createdAt" FROM "%s" WHERE 1=1 `, 
		cond(logType == "hourly", "\"readingHour\"", "\"readingTime\""),
		cond(logType == "hourly", "\"valueMwh\"", "\"valueMw\""),
		tableName))

	var args []any
	argIdx := 1

	if companyID != "" {
		log.Printf("[DEBUG-LOGS] Filtering by companyID: %s", companyID)
		query.WriteString(fmt.Sprintf(` AND "companyId" = $%d `, argIdx))
		args = append(args, companyID)
		argIdx++
	}

	if plantID != "" {
		if _, err := uuid.Parse(plantID); err == nil {
			query.WriteString(fmt.Sprintf(` AND "plantId" = $%d `, argIdx))
		} else {
			query.WriteString(fmt.Sprintf(` AND "externalPlantId" = $%d `, argIdx))
		}
		args = append(args, plantID)
		argIdx++
	}

	if startDate != "" {
		query.WriteString(fmt.Sprintf(` AND "readingDate" >= $%d `, argIdx))
		args = append(args, startDate)
		argIdx++
	}

	if endDate != "" {
		query.WriteString(fmt.Sprintf(` AND "readingDate" <= $%d `, argIdx))
		args = append(args, endDate)
		argIdx++
	}

	query.WriteString(` ORDER BY "createdAt" DESC LIMIT 500`)

	log.Printf("[DEBUG-LOGS] SQL: %s", query.String())
	log.Printf("[DEBUG-LOGS] ARGS: %v", args)

	rows, err := db.Pool.Query(context.Background(), query.String(), args...)
	if err != nil {
		log.Printf("[DEBUG-LOGS] CRITICAL QUERY ERROR: %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer rows.Close()

	var logs []any
	for rows.Next() {
		if logType == "hourly" {
			var r models.YtbsHourlyProduction
			if err := rows.Scan(&r.ID, &r.PlantID, &r.ExternalPlantID, &r.YtbsPlantID, &r.ReadingDate, &r.ReadingHour, &r.ValueMwh, &r.IsSent, &r.LastAttemptAt, &r.RetryCount, &r.CreatedAt); err == nil {
				logs = append(logs, r)
			}
		} else {
			var r models.YtbsInstantProduction
			if err := rows.Scan(&r.ID, &r.PlantID, &r.ExternalPlantID, &r.YtbsPlantID, &r.ReadingDate, &r.ReadingTime, &r.ValueMw, &r.IsSent, &r.LastAttemptAt, &r.RetryCount, &r.CreatedAt); err == nil {
				logs = append(logs, r)
			}
		}
	}

	if logs == nil {
		logs = []any{}
	}
	response.Success(c, http.StatusOK, logs)
}

func cond(condition bool, t, f string) string {
	if condition {
		return t
	}
	return f
}

func DeleteProductionLog(c *gin.Context) {
	logType := c.Param("type")
	id := c.Param("id")

	tableName := "YtbsInstantProduction"
	if logType == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	uid, err := uuid.Parse(id)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID formatı")
		return
	}

	_, err = db.Pool.Exec(context.Background(), fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, tableName), uid)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Kayıt silindi"})
}

func CreateTestLog(c *gin.Context) {
	var req struct {
		CompanyID string `json:"companyId"`
		Type      string `json:"type"` // "instant" or "hourly"
		// Optional manual overrides
		ManualYtbsID  int      `json:"ytbsId"`
		ManualLicense string   `json:"licenseNo"`
		Value         *float64 `json:"value"`
		Date          string   `json:"date"` // YYYY-MM-DD
		Time          string   `json:"time"` // HH:mm or HH:00
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	valLog := "nil"
	if req.Value != nil {
		valLog = fmt.Sprintf("%.4f", *req.Value)
	}

	log.Printf("======================================================")
	log.Printf("[DEBUG-TEST] NEW REQUEST RECEIVED")
	log.Printf("[DEBUG-TEST] CoID: %s, Type: %s, Val: %s, Date: %s, Time: %s", req.CompanyID, req.Type, valLog, req.Date, req.Time)
	log.Printf("======================================================")

	// Şirkete ait bir YTBS santrali bul veya manuel veriyi kullan
	var ypID uuid.UUID
	var plantID uuid.UUID
	var ytbsID int
	var licenseNo string
	var err error

	compUUID, _ := uuid.Parse(req.CompanyID)

	var plantIDPtr any = nil
	var ypIDPtr any = nil

	if req.ManualYtbsID != 0 || req.ManualLicense != "" {
		// Manuel mod: Veritabanında aramadan doğrudan kullanmak yerine,
		// eğer sistemde bu ytbsId'ye ait bir santral varsa plantId'sini bulalım ki listelerde gözüksün.
		ytbsID = req.ManualYtbsID
		licenseNo = req.ManualLicense
		
		err = db.Pool.QueryRow(context.Background(), `
			SELECT yp.id, yp."plantId"
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
			WHERE p."companyId" = $1 AND yp."ytbsId" = $2
			LIMIT 1
		`, compUUID, ytbsID).Scan(&ypID, &plantID)
		
		if err == nil {
			plantIDPtr = plantID
			ypIDPtr = ypID
			log.Printf("[YTBS-TEST] Manual mode: Found matching plant for ID %d", ytbsID)
		} else {
			log.Printf("[YTBS-TEST] Manual mode: No matching plant found for ID %d, inserting with NULL plantId", ytbsID)
		}
	} else {
		// Otomatik mod: Veritabanında ilk santrali bul
		err = db.Pool.QueryRow(context.Background(), `
			SELECT yp.id, yp."plantId", yp."ytbsId", yp.license_no
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
			WHERE p."companyId" = $1
			LIMIT 1
		`, compUUID).Scan(&ypID, &plantID, &ytbsID, &licenseNo)

		if err != nil {
			response.Error(c, http.StatusNotFound, response.ErrNotFound, "Bu şirkete kayıtlı YTBS santrali bulunamadı. Lütfen satırdaki butonları kullanın veya 'Sisteme Aktar' yapın.")
			return
		}
		plantIDPtr = plantID
		ypIDPtr = ypID
	}

	now := time.Now()
	dateStr := now.Format("2006-01-02")
	if req.Date != "" {
		dateStr = req.Date
	}

	timeStr := now.Format("15:04")
	if req.Time != "" {
		timeStr = req.Time
	}

	val := 0.0
	if req.Value != nil {
		val = *req.Value
	} else {
		// Default mock value only if nil
		if req.Type == "instant" {
			val = 10.5
		} else {
			val = 45.2
		}
	}

	if req.Type == "instant" {
		log.Printf("[YTBS-TEST] Inserting INSTANT: val=%.4f to plant %d for time %s %s", val, ytbsID, dateStr, timeStr)
		_, err = db.Pool.Exec(context.Background(), `
			INSERT INTO "YtbsInstantProduction" 
			(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingTime", "valueMw", "isSent", "createdAt", "companyId", "licenseNo", "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, 0)
			ON CONFLICT ("ytbsPlantId", "readingDate", "readingTime") 
			DO UPDATE SET "valueMw" = EXCLUDED."valueMw", "isSent" = false, "createdAt" = NOW()
		`, uuid.New(), plantIDPtr, ytbsID, ypIDPtr, dateStr, timeStr, val, false, compUUID, licenseNo)
	} else {
		// Hourly ensure format HH:00 if not specified
		finalHour := timeStr
		if !strings.Contains(finalHour, ":") {
			finalHour = fmt.Sprintf("%02d:00", now.Hour())
		}
		
		log.Printf("[YTBS-TEST] Inserting HOURLY: val=%.4f to plant %d for hour %s %s", val, ytbsID, dateStr, finalHour)
		_, err = db.Pool.Exec(context.Background(), `
			INSERT INTO "YtbsHourlyProduction" 
			(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingHour", "valueMwh", "isSent", "createdAt", "companyId", "licenseNo", "retryCount")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, 0)
			ON CONFLICT ("ytbsPlantId", "readingDate", "readingHour") 
			DO UPDATE SET "valueMwh" = EXCLUDED."valueMwh", "isSent" = false, "createdAt" = NOW()
		`, uuid.New(), plantIDPtr, ytbsID, ypIDPtr, dateStr, finalHour, val, false, compUUID, licenseNo)
	}

	if err != nil {
		log.Printf("[YTBS-TEST] INSERT error: %v", err)
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Veritabanı hatası: "+err.Error())
		return
	}

	response.Success(c, http.StatusCreated, gin.H{"message": "Test kaydı oluşturuldu"})
}

// Stubs for currently not implemented external queries (to avoid 404)
func QueryExternalPlants(c *gin.Context) {
	var req struct {
		CompanyID string `json:"companyId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	cid, err := uuid.Parse(req.CompanyID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid company ID")
		return
	}

	svc := services.GetYtbsService()
	result, err := svc.QueryExternalPlants(c.Request.Context(), cid)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	// Cross-reference with our database to mark imported plants
	rows, err := db.Pool.Query(c.Request.Context(), `
		SELECT yp."ytbsId" 
		FROM "YtbsPlant" yp
		JOIN "Plant" p ON yp."plantId" = p.id
		WHERE p."companyId" = $1
	`, cid)
	
	importedMap := make(map[int]bool)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var yid int
			if err := rows.Scan(&yid); err == nil {
				importedMap[yid] = true
			}
		}
	}

	// Enforce structure and add isImported flag
	if resMap, ok := result.(map[string]any); ok {
		if veri, ok := resMap["veri"].([]any); ok {
			for i, p := range veri {
				if plant, ok := p.(map[string]any); ok {
					if idVal, ok := plant["id"].(float64); ok {
						ytbsId := int(idVal)
						plant["isImported"] = importedMap[ytbsId]
						veri[i] = plant
					}
				}
			}
			resMap["veri"] = veri
		}
		response.Success(c, http.StatusOK, resMap)
		return
	}

	response.Success(c, http.StatusOK, result)
}

func ImportExternalPlants(c *gin.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[YTBS] PANIC in ImportExternalPlants: %v", r)
			response.Error(c, http.StatusInternalServerError, response.ErrInternal, fmt.Sprintf("Kritik Hata: %v", r))
		}
	}()

	var req struct {
		CompanyID string `json:"companyId"`
		Plants    []any  `json:"plants"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	if req.CompanyID == "" {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Company ID is required")
		return
	}

	compUUID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid Company ID format")
		return
	}

	ctx := context.Background()
	importedCount := 0
	
	log.Printf("[YTBS] Starting import for company %s, received %d plants", req.CompanyID, len(req.Plants))
	
	for i, pObj := range req.Plants {
		p, ok := pObj.(map[string]interface{})
		if !ok {
			log.Printf("[YTBS] Plant at index %d is not a valid map", i)
			continue
		}
		
		// Safe extraction of values from TEİAŞ JSON
		ytbsId := 0
		if idVal, ok := p["id"]; ok {
			if f, ok := idVal.(float64); ok {
				ytbsId = int(f)
			} else if s, ok := idVal.(string); ok {
				idInt, _ := strconv.Atoi(s)
				ytbsId = idInt
			}
		}

		if ytbsId == 0 {
			log.Printf("[YTBS] Plant at index %d has no valid ID: %+v", i, p)
			continue
		}
		
		ad := ""
		if n, ok := p["ad"].(string); ok {
			ad = n
		}
		
		guc := 0.0
		if tarihce, ok := p["tarihce"].(map[string]interface{}); ok {
			if g, ok := tarihce["acGucu"].(float64); ok {
				guc = g
			}
		}

		licenseNo := ""
		if sirket, ok := p["baglantiAnlasmasiSirketi"].(map[string]interface{}); ok {
			if l, ok := sirket["id"].(string); ok {
				licenseNo = l
			}
		}

		// Handle plant mapping and creation
		var plantId uuid.UUID
		foundPlant := false

		// 1. Try to find an existing plant linked to this YTBS ID
		// 1. Try to find an existing plant linked to this YTBS ID and verify it belongs to this company
		err = db.Pool.QueryRow(ctx, `
			SELECT yp."plantId" 
			FROM "YtbsPlant" yp
			JOIN "Plant" p ON yp."plantId" = p.id
			WHERE yp."ytbsId" = $1 AND p."companyId" = $2
		`, ytbsId, compUUID).Scan(&plantId)
		if err == nil {
			foundPlant = true
			log.Printf("[YTBS] Found existing link for plant %s (ytbsId: %d) -> plantId: %s", ad, ytbsId, plantId)
		}

		// 2. If not found by YtbsPlant link, try to find in main Plant table by ytbsCode
		if !foundPlant {
			err = db.Pool.QueryRow(ctx, `SELECT "id" FROM "Plant" WHERE "ytbsCode" = $1 AND "companyId" = $2`, strconv.Itoa(ytbsId), compUUID).Scan(&plantId)
			if err == nil {
				foundPlant = true
				log.Printf("[YTBS] Found existing Plant record (ytbsCode: %d) -> plantId: %s", ytbsId, plantId)
			}
		}

		// 3. If still NOT found, CREATE a new record in the main Plant table
		if !foundPlant {
			plantId = uuid.New()
			log.Printf("[YTBS] Creating NEW Plant record for %s (ytbsId: %d)", ad, ytbsId)
			pType := "SOLAR"
			upperName := strings.ToUpper(ad)
			if strings.Contains(upperName, "RES") || strings.Contains(upperName, "RÜZGAR") {
				pType = "WIND"
			} else if strings.Contains(upperName, "HES") || strings.Contains(upperName, "HİDRO") {
				pType = "HYDRO"
			}

			_, err = db.Pool.Exec(ctx, `
				INSERT INTO "Plant" ("id", "companyId", "plantName", "plantType", "isActive", "ytbsCode", "canSendYtbs", "createdAt", "updatedAt")
				VALUES ($1, $2, $3, $4, true, $5, true, NOW(), NOW())
			`, plantId, compUUID, ad, pType, strconv.Itoa(ytbsId))
			
			if err != nil {
				log.Printf("[YTBS] Error creating main Plant for %s: %v", ad, err)
				continue 
			}
			foundPlant = true
		}

		// 4. Create the YtbsPlant integration record
		_, err = db.Pool.Exec(ctx, `
			INSERT INTO "YtbsPlant" ("id", "plantId", "ytbsId", "license_no", "plant_name", "capacity_ac", "isActive")
			VALUES ($1, $2, $3, $4, $5, $6, true)
		`, uuid.New(), plantId, ytbsId, licenseNo, ad, guc)
		
		if err != nil {
			log.Printf("[YTBS] Database error during YtbsPlant insert for %d (%s): %v", ytbsId, ad, err)
			continue
		}
		importedCount++
	}
	log.Printf("[YTBS] Finished import. Imported %d/%d plants.", importedCount, len(req.Plants))

	response.Success(c, http.StatusOK, gin.H{
		"message": "İşlem tamamlandı",
		"importedCount": importedCount,
	})
}

func RemoveExternalPlant(c *gin.Context) {
	var req struct {
		CompanyID string `json:"companyId"`
		YtbsID    int    `json:"ytbsId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	compUUID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid company ID")
		return
	}

	// Find the plant link to delete it and the plant
	var plantId uuid.UUID
	err = db.Pool.QueryRow(context.Background(), `
		SELECT yp."plantId" 
		FROM "YtbsPlant" yp
		JOIN "Plant" p ON yp."plantId" = p.id
		WHERE yp."ytbsId" = $1 AND p."companyId" = $2
	`, req.YtbsID, compUUID).Scan(&plantId)

	if err != nil {
		response.Error(c, http.StatusNotFound, response.ErrDatabase, "Link not found")
		return
	}

	tx, err := db.Pool.Begin(context.Background())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}
	defer tx.Rollback(context.Background())

	// Delete from YtbsPlant
	_, err = tx.Exec(context.Background(), `DELETE FROM "YtbsPlant" WHERE "plantId" = $1`, plantId)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	// Delete from Plant
	_, err = tx.Exec(context.Background(), `DELETE FROM "Plant" WHERE "id" = $1`, plantId)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	if err := tx.Commit(context.Background()); err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Santral sistemden kaldırıldı"})
}

func QueryExternalLogs(c *gin.Context) {
	var req struct {
		CompanyID string `json:"companyId"`
		Type      string `json:"type"` // hourly or instant
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	cid, err := uuid.Parse(req.CompanyID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Invalid company ID")
		return
	}

	svc := services.GetYtbsService()
	logs, err := svc.QueryExternalLogs(c.Request.Context(), cid, req.Type)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, logs)
}
func BulkDeleteLogs(c *gin.Context) {
	var req struct {
		Type      string `json:"type"`
		PlantID   string `json:"plantId"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	tableName := "YtbsInstantProduction"
	if req.Type == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	query := fmt.Sprintf(`DELETE FROM "%s" WHERE "externalPlantId" = $1 AND "readingDate" >= $2 AND "readingDate" <= $3`, tableName)
	_, err := db.Pool.Exec(context.Background(), query, req.PlantID, req.StartDate, req.EndDate)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Kayıtlar silindi"})
}

func BulkSendLogs(c *gin.Context) {
	var req struct {
		Type      string `json:"type"`
		PlantID   string `json:"plantId"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	tableName := "YtbsInstantProduction"
	if req.Type == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	query := fmt.Sprintf(`UPDATE "%s" SET "isSent" = false, "retryCount" = 0, "lastAttemptAt" = NULL WHERE "externalPlantId" = $1 AND "readingDate" >= $2 AND "readingDate" <= $3`, tableName)
	_, err := db.Pool.Exec(context.Background(), query, req.PlantID, req.StartDate, req.EndDate)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, err.Error())
		return
	}

	response.Success(c, http.StatusOK, gin.H{"message": "Kayıtlar gönderim için işaretlendi"})
}
func SendLogNow(c *gin.Context) {
	logType := c.Param("type")
	id := c.Param("id")

	tableName := "YtbsInstantProduction"
	if logType == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	uid, err := uuid.Parse(id)
	if err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, "Geçersiz ID formatı")
		return
	}

	// 1. Get log details
	var date, timeOrHour string
	var val float64
	var externalPlantId int
	var companyId uuid.UUID

	query := fmt.Sprintf(`SELECT "readingDate", %s, %s, "externalPlantId", "companyId" FROM "%s" WHERE id = $1`, 
		cond(logType == "hourly", "\"readingHour\"", "\"readingTime\""),
		cond(logType == "hourly", "\"valueMwh\"", "\"valueMw\""),
		tableName)
	
	err = db.Pool.QueryRow(context.Background(), query, uid).Scan(&date, &timeOrHour, &val, &externalPlantId, &companyId)
	if err != nil {
		response.Error(c, http.StatusNotFound, response.ErrNotFound, "Kayıt bulunamadı")
		return
	}

	// 2. Get credentials and plant info
	var apiKey, username, password, license *string
	err = db.Pool.QueryRow(context.Background(), `
		SELECT cp."ytbsApiKey", cp."ytbsUsername", cp."ytbsPassword", yp.license_no
		FROM "CompanyProfile" cp
		JOIN "YtbsPlant" yp ON yp."ytbsId" = $1
		WHERE cp.id = $2
	`, externalPlantId, companyId).Scan(&apiKey, &username, &password, &license)

	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrDatabase, "Santral veya yetki bilgisi bulunamadı")
		return
	}

	// 3. Send via service
	svc := services.GetYtbsService()
	token, err := svc.Login(context.Background(), *apiKey, *username, *password)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, response.ErrInternal, "YTBS Login başarısız: "+err.Error())
		return
	}

	payload := map[string]interface{}{
		"baglantiAnlasmasiSirketiLisansNo": *license,
		"veri": []map[string]interface{}{
			{
				"tarih": date,
				"saat":  timeOrHour,
				"lisanssizSantralId": externalPlantId,
				"veriDeger": val,
			},
		},
	}
	
	endpoint := "/veritoplama/anliklisanssizsantralarz/ekle"
	if logType == "hourly" {
		endpoint = "/veritoplama/saatliklisanssizsantraluretim/ekle"
	}

	b, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", services.YtbsBaseURL+endpoint, bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", *apiKey)
	req.Header.Set("AUTH_TOKEN", token)
	
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, response.ErrInternal, "Gönderim hatası: "+err.Error())
		return
	}
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)

	isSuccess := false
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		isSuccess = true
		if val, ok := res["basarili"].(bool); ok && !val {
			isSuccess = false
		}
	}

	if isSuccess {
		db.Pool.Exec(context.Background(), fmt.Sprintf(`UPDATE "%s" SET "isSent" = true, "retryCount" = 0, "lastAttemptAt" = NOW() WHERE id = $1`, tableName), uid)
		response.Success(c, http.StatusOK, gin.H{"message": "Veri başarıyla YTBS'ye gönderildi"})
	} else {
		db.Pool.Exec(context.Background(), fmt.Sprintf(`UPDATE "%s" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, tableName), uid)
		
		errMsg := "YTBS reddetti (Status " + strconv.Itoa(resp.StatusCode) + ")"
		if msgs, ok := res["mesaj"].([]interface{}); ok && len(msgs) > 0 {
			errMsg = fmt.Sprintf("TEİAŞ Hatası: %v", msgs[0])
		} else if msg, ok := res["mesaj"].(string); ok {
			errMsg = fmt.Sprintf("TEİAŞ Hatası: %s", msg)
		}
		response.Error(c, http.StatusBadRequest, response.ErrInternal, errMsg)
	}
}
