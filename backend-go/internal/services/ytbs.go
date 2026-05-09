package services

import (
	"bytes"
	"context"
	"encoding/json"
	"energy-scada-platform/internal/db"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

const YtbsBaseURL = "https://ytbsws.teias.gov.tr/ytbs-webservis/rest"

type YtbsService struct {
	client *http.Client
}

var ytbsInstance *YtbsService

func GetYtbsService() *YtbsService {
	if ytbsInstance == nil {
		ytbsInstance = &YtbsService{
			client: &http.Client{Timeout: 60 * time.Second},
		}
	}
	return ytbsInstance
}

type TokenResponse struct {
	Veri struct {
		Jeton string `json:"jeton"`
	} `json:"veri"`
	Jeton   string `json:"jeton"` // Some responses might have it at root
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func (s *YtbsService) Login(ctx context.Context, apiKey, username, password string) (string, error) {
	payload := map[string]string{
		"kullaniciAdi": username,
		"sifre":        password,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/yetkilendirme/login", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var res TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}

	token := res.Veri.Jeton
	if token == "" {
		token = res.Jeton
	}

	if token == "" {
		return "", fmt.Errorf("login failed: %s (status %d)", res.Message, resp.StatusCode)
	}

	return token, nil
}

func (s *YtbsService) QueryExternalPlants(ctx context.Context, cid uuid.UUID) (any, error) {
	// 1. Get company credentials
	var apiKey, username, password *string
	err := db.Pool.QueryRow(ctx, `
		SELECT "ytbsApiKey", "ytbsUsername", "ytbsPassword" 
		FROM "CompanyProfile" WHERE id = $1
	`, cid).Scan(&apiKey, &username, &password)

	if err != nil { return nil, err }
	if apiKey == nil || username == nil || password == nil {
		return nil, fmt.Errorf("YTBS credentials missing for company")
	}

	// 2. Login
	token, err := s.Login(ctx, *apiKey, *username, *password)
	if err != nil { return nil, err }

	// 3. Query
	date := time.Now().Format("2006-01-02")
	payload := map[string]string{
		"tarih": date,
	}
	queryBody, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/modelleme/uretim/lisanssizsantral/listele", bytes.NewBuffer(queryBody))
	if err != nil { return nil, err }
	
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", *apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := s.client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Ensure 'veri' is a slice and not null for the frontend
	if v, ok := result["veri"]; !ok || v == nil {
		result["veri"] = []any{}
	}

	return result, nil
}

func (s *YtbsService) ProcessPendingInstant() {
	ctx := context.Background()
	rows, err := db.Pool.Query(ctx, `
		SELECT 
			COALESCE(p.id, '00000000-0000-0000-0000-000000000000'::uuid), 
			COALESCE(yp."ytbsId", i."externalPlantId", 0), 
			COALESCE(yp.license_no, i."licenseNo", ''), 
			cp.id, cp."ytbsApiKey", cp."ytbsUsername", cp."ytbsPassword",
			i."readingDate", i."readingTime", i."valueMw", i.id
		FROM "YtbsInstantProduction" i
		LEFT JOIN "YtbsPlant" yp ON i."ytbsPlantId" = yp.id
		LEFT JOIN "Plant" p ON yp."plantId" = p.id
		JOIN "CompanyProfile" cp ON (p."companyId" = cp.id OR i."companyId" = cp.id)
		WHERE i."isSent" = false
		AND i."retryCount" >= 0
		AND (i."lastAttemptAt" IS NULL OR i."lastAttemptAt" < $1)
		AND i."retryCount" < 5
		LIMIT 50
	`, time.Now().Add(-5*time.Minute))
	if err != nil {
		return
	}
	defer rows.Close()

	// In a real implementation we'd group by license and send batch
	// For this port, simplified one-by-one or small batch is fine to start
	for rows.Next() {
		var id, cpID, prodID uuid.UUID
		var ytbsID int
		var license, apiKey, username, password, date, timeStr string
		var val float64
		
		if err := rows.Scan(&id, &ytbsID, &license, &cpID, &apiKey, &username, &password, &date, &timeStr, &val, &prodID); err == nil {
			token, err := s.Login(ctx, apiKey, username, password)
			if err != nil { continue }
			
			payload := map[string]interface{}{
				"baglantiAnlasmasiSirketiLisansNo": license,
				"veri": []map[string]interface{}{
					{
						"tarih": date,
						"saat":  timeStr,
						"lisanssizSantralId": ytbsID,
						"veriDeger": val,
					},
				},
			}
			b, _ := json.Marshal(payload)
			req, _ := http.NewRequest("POST", YtbsBaseURL+"/veritoplama/anliklisanssizsantralarz/ekle", bytes.NewBuffer(b))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("SERVICE_KEY", apiKey)
			req.Header.Set("AUTH_TOKEN", token)
			
			resp, _ := s.client.Do(req)
			if resp != nil {
				var res map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&res)
				resp.Body.Close()
				
				isSuccess := false
				if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
					isSuccess = true
					if val, ok := res["basarili"].(bool); ok && !val {
						isSuccess = false
					}
				}
				
				if isSuccess {
					db.Pool.Exec(ctx, `UPDATE "YtbsInstantProduction" SET "isSent" = true, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
					log.Printf("[YTBS] Successfully sent INSTANT log for license %s", license)
				} else {
					db.Pool.Exec(ctx, `UPDATE "YtbsInstantProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
					errMsg := "Unknown error"
					if msgs, ok := res["mesaj"].([]interface{}); ok && len(msgs) > 0 {
						errMsg = fmt.Sprintf("%v", msgs[0])
					} else if msg, ok := res["mesaj"].(string); ok {
						errMsg = msg
					}
					log.Printf("[YTBS] Failed to send INSTANT log for license %s (Status %d): %s", license, resp.StatusCode, errMsg)
				}
			} else {
				db.Pool.Exec(ctx, `UPDATE "YtbsInstantProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Failed to send INSTANT log for license %s: Network error", license)
			}
		}
	}
}

func (s *YtbsService) ProcessPendingHourly() {
	ctx := context.Background()
	rows, err := db.Pool.Query(ctx, `
		SELECT p.id, COALESCE(yp."ytbsId", p."externalPlantId", 0), yp.license_no, cp.id, cp."ytbsApiKey", cp."ytbsUsername", cp."ytbsPassword",
		       p."readingDate", p."readingHour", p."valueMwh", p.id
		FROM "YtbsHourlyProduction" p
		JOIN "YtbsPlant" yp ON p."ytbsPlantId" = yp.id
		JOIN "Plant" lp ON yp."plantId" = lp.id
		JOIN "CompanyProfile" cp ON lp."companyId" = cp.id
		WHERE p."isSent" = false 
		AND p."retryCount" >= 0 
		AND p."retryCount" < 10
		LIMIT 100
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, cpID, prodID uuid.UUID
		var ytbsID int
		var license, apiKey, username, password, date, hourStr string
		var val float64
		
		if err := rows.Scan(&id, &ytbsID, &license, &cpID, &apiKey, &username, &password, &date, &hourStr, &val, &prodID); err == nil {
			token, err := s.Login(ctx, apiKey, username, password)
			if err != nil { continue }
			
			payload := map[string]interface{}{
				"baglantiAnlasmasiSirketiLisansNo": license,
				"veri": []map[string]interface{}{
					{
						"tarih": date,
						"saat":  hourStr,
						"lisanssizSantralId": ytbsID,
						"veriDeger": val,
					},
				},
			}
			b, _ := json.Marshal(payload)
			req, _ := http.NewRequest("POST", YtbsBaseURL+"/veritoplama/saatliklisanssizsantraluretim/ekle", bytes.NewBuffer(b))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("SERVICE_KEY", apiKey)
			req.Header.Set("AUTH_TOKEN", token)
			
			resp, _ := s.client.Do(req)
			if resp != nil {
				var res map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&res)
				resp.Body.Close()
				
				isSuccess := false
				if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
					isSuccess = true
					if val, ok := res["basarili"].(bool); ok && !val {
						isSuccess = false
					}
				}
				
				if isSuccess {
					db.Pool.Exec(ctx, `UPDATE "YtbsHourlyProduction" SET "isSent" = true, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
					log.Printf("[YTBS] Successfully sent HOURLY log for license %s", license)
				} else {
					db.Pool.Exec(ctx, `UPDATE "YtbsHourlyProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
					errMsg := "Unknown error"
					if msgs, ok := res["mesaj"].([]interface{}); ok && len(msgs) > 0 {
						errMsg = fmt.Sprintf("%v", msgs[0])
					} else if msg, ok := res["mesaj"].(string); ok {
						errMsg = msg
					}
					log.Printf("[YTBS] Failed to send HOURLY log for license %s (Status %d): %s", license, resp.StatusCode, errMsg)
				}
			} else {
				db.Pool.Exec(ctx, `UPDATE "YtbsHourlyProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Failed to send HOURLY log for license %s: Network error", license)
			}
		}
	}
}

func (s *YtbsService) StartWorker() {
	go func() {
		log.Printf("[YTBS] Background worker started")
		ticker := time.NewTicker(5 * time.Minute)
		for {
			select {
			case <-ticker.C:
				s.ProcessPendingInstant()
				s.ProcessPendingHourly()
			}
		}
	}()
}

func (s *YtbsService) QueryExternalLogs(ctx context.Context, companyID uuid.UUID, logType string, startDate, endDate string) ([]any, error) {
	if startDate == "" {
		startDate = time.Now().Format("2006-01-02")
	}
	if endDate == "" {
		endDate = startDate
	}

	var apiKey, username, password *string
	err := db.Pool.QueryRow(ctx, `
		SELECT "ytbsApiKey", "ytbsUsername", "ytbsPassword" 
		FROM "CompanyProfile" WHERE id = $1
	`, companyID).Scan(&apiKey, &username, &password)
	if err != nil { return nil, err }
	if apiKey == nil || username == nil || password == nil { 
		return nil, fmt.Errorf("YTBS credentials missing for company") 
	}

	token, err := s.Login(ctx, *apiKey, *username, *password)
	if err != nil { return nil, err }

	endpoint := "/veritoplama/anliklisanssizsantralarz/sorgula"
	if logType == "hourly" {
		endpoint = "/veritoplama/saatliklisanssizsantraluretim/sorgula"
	}

	rows, err := db.Pool.Query(ctx, `
		SELECT yp."ytbsId", yp.license_no 
		FROM "YtbsPlant" yp
		JOIN "Plant" p ON yp."plantId" = p.id
		WHERE p."companyId" = $1
	`, companyID)
	if err != nil { return nil, err }
	defer rows.Close()

	var allLogs = []any{} // Initialize as empty slice, not nil
	for rows.Next() {
		var ytbsID int
		var licenseNo string
		if err := rows.Scan(&ytbsID, &licenseNo); err != nil {
			continue
		}

		payload := map[string]any{
			"lisanssizSantralId": ytbsID,
			"baglantiAnlasmasiSirketiLisansNo": licenseNo,
			"tarih": startDate, // TEİAŞ often only supports single date sorgula, we use startDate
		}
		
		b, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+endpoint, bytes.NewBuffer(b))
		if err != nil { continue }
		
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("SERVICE_KEY", *apiKey)
		req.Header.Set("AUTH_TOKEN", token)

		resp, err := s.client.Do(req)
		if err != nil { continue }
		
		var res struct {
			Veri  any `json:"veri"`
			Veri2 any `json:"Veri"`
			Data  any `json:"data"`
			Data2 any `json:"Data"`
		}
		json.NewDecoder(resp.Body).Decode(&res)
		resp.Body.Close()

		veri := res.Veri
		if veri == nil { veri = res.Veri2 }
		if veri == nil { veri = res.Data }
		if veri == nil { veri = res.Data2 }

		if veri != nil {
			processItem := func(item any) {
				if m, ok := item.(map[string]any); ok {
					// Add internal tracking fields
					m["lisanssizSantralId"] = ytbsID
					m["baglantiAnlasmasiSirketiLisansNo"] = licenseNo
					
					// Normalize for frontend
					if val, ok := m["zaman"].(string); ok && strings.Contains(val, "T") {
						parts := strings.Split(val, "T")
						if len(parts) >= 2 {
							m["readingDate"] = parts[0]
							m["readingTime"] = parts[1]
							m["readingHour"] = parts[1]
						}
					}

					if val, ok := m["tarih"]; ok { m["readingDate"] = val }
					if val, ok := m["Tarih"]; ok { m["readingDate"] = val }
					if val, ok := m["okumaTarihi"]; ok { m["readingDate"] = val }
					
					if val, ok := m["saat"]; ok { 
						m["readingTime"] = val 
						m["readingHour"] = val
					}
					if val, ok := m["Saat"]; ok { 
						m["readingTime"] = val 
						m["readingHour"] = val
					}
					if val, ok := m["okumaSaati"]; ok { 
						m["readingTime"] = val 
						m["readingHour"] = val
					}

					if val, ok := m["veriDeger"]; ok {
						m["valueMw"] = val
						m["valueMwh"] = val
					}

					allLogs = append(allLogs, m)
				}
			}

			if list, ok := veri.([]any); ok {
				for _, item := range list {
					processItem(item)
				}
			} else {
				processItem(veri)
			}
		}
	}

	return allLogs, nil
}

func (s *YtbsService) DeleteRemoteLog(ctx context.Context, apiKey, token, license string, ytbsId int, date, timeStr, logType string) error {
	endpoint := "/veritoplama/anliklisanssizsantralarz/sil"
	if logType == "hourly" {
		endpoint = "/veritoplama/saatliklisanssizsantraluretim/sil"
	}

	// TEİAŞ normalization
	// 1. Date: If DD.MM.YYYY (often returned by query) -> YYYY-MM-DD
	if len(date) == 10 && date[2] == '.' && date[5] == '.' {
		parts := strings.Split(date, ".")
		if len(parts) == 3 {
			date = fmt.Sprintf("%s-%s-%s", parts[2], parts[1], parts[0])
		}
	} else if len(date) > 10 {
		date = date[:10] // Handle ISO strings like 2026-05-07T00:00:00Z
	}

	// 2. Time: Ensure HH:mm (if ISO string passed, extract time part)
	if strings.Contains(timeStr, "T") {
		parts := strings.Split(timeStr, "T")
		if len(parts) >= 2 {
			timeStr = parts[1]
		}
	}
	if len(timeStr) > 5 {
		timeStr = timeStr[:5]
	}

	payload := map[string]any{
		"baglantiAnlasmasiSirketiLisansNo": license,
		"tarih":                            date,
		"saat":                             timeStr,
		"lisanssizSantralId":               ytbsId,
	}

	b, _ := json.Marshal(payload)
	log.Printf("[YTBS] Delete request to %s: %s", endpoint, string(b))
	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+endpoint, bytes.NewBuffer(b))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var res map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return fmt.Errorf("TEİAŞ yanıtı okunamadı (Status %d)", resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		errMsg := "Silme işlemi başarısız"
		if msgs, ok := res["mesaj"].([]any); ok && len(msgs) > 0 {
			errMsg = fmt.Sprintf("%v", msgs[0])
		} else if msg, ok := res["mesaj"].(string); ok {
			errMsg = msg
		}
		return fmt.Errorf("TEİAŞ Hatası: %s", errMsg)
	}

	if val, ok := res["basarili"].(bool); ok && !val {
		errMsg := "Silme işlemi başarısız (basarili: false)"
		if msgs, ok := res["mesaj"].([]any); ok && len(msgs) > 0 {
			errMsg = fmt.Sprintf("%v", msgs[0])
		} else if msg, ok := res["mesaj"].(string); ok {
			errMsg = msg
		}
		return fmt.Errorf("TEİAŞ Hatası: %s", errMsg)
	}

	return nil
}
