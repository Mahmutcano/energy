package handlers

import (
	"context"
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

func GetProductionLogs(c *gin.Context) {
	logType := c.Query("type")
	plantID := c.Query("plantId")

	var query string
	if logType == "hourly" {
		query = `SELECT id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingHour", "valueMwh", "isSent", "lastAttemptAt", "retryCount", "createdAt" 
				 FROM "YtbsHourlyProduction" `
		if plantID != "" {
			query += fmt.Sprintf(` WHERE "ytbsPlantId" = '%s' `, plantID)
		}
		query += ` ORDER BY "createdAt" DESC LIMIT 100 `
	} else {
		query = `SELECT id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingTime", "valueMw", "isSent", "lastAttemptAt", "retryCount", "createdAt" 
				 FROM "YtbsInstantProduction" `
		if plantID != "" {
			query += fmt.Sprintf(` WHERE "ytbsPlantId" = '%s' `, plantID)
		}
		query += ` ORDER BY "createdAt" DESC LIMIT 100 `
	}

	rows, err := db.Pool.Query(context.Background(), query)
	if err != nil {
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

func DeleteProductionLog(c *gin.Context) {
	logType := c.Param("type")
	id := c.Param("id")

	tableName := "YtbsInstantProduction"
	if logType == "hourly" {
		tableName = "YtbsHourlyProduction"
	}

	_, err := db.Pool.Exec(context.Background(), fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, tableName), id)
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
		ManualYtbsID  int    `json:"ytbsId"`
		ManualLicense string `json:"licenseNo"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, response.ErrInvalidInput, err.Error())
		return
	}

	log.Printf("[YTBS-TEST] Request received: CompanyID=%s, Type=%s, ManualID=%d, ManualLicense=%s", 
		req.CompanyID, req.Type, req.ManualYtbsID, req.ManualLicense)

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
		// Manuel mod: Veritabanında aramadan doğrudan kullan
		ytbsID = req.ManualYtbsID
		licenseNo = req.ManualLicense
		// ypID ve plantID NIL kalır
		log.Printf("[YTBS-TEST] Manual mode: ID %d, License %s", ytbsID, licenseNo)
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
	timeStr := now.Format("15:04")

	if req.Type == "instant" {
		_, err = db.Pool.Exec(context.Background(), `
			INSERT INTO "YtbsInstantProduction" 
			(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingTime", "valueMw", "isSent", "createdAt", "companyId", "licenseNo")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
		`, uuid.New(), plantIDPtr, ytbsID, ypIDPtr, dateStr, timeStr, 10.5, false, compUUID, licenseNo)
	} else {
		_, err = db.Pool.Exec(context.Background(), `
			INSERT INTO "YtbsHourlyProduction" 
			(id, "plantId", "externalPlantId", "ytbsPlantId", "readingDate", "readingHour", "valueMwh", "isSent", "createdAt", "companyId", "licenseNo")
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
		`, uuid.New(), plantIDPtr, ytbsID, ypIDPtr, dateStr, fmt.Sprintf("%02d:00", now.Hour()), 45.2, false, compUUID, licenseNo)
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
