package services

import (
	"bytes"
	"context"
	"encoding/json"
	"energy-scada-platform/internal/db"
	"fmt"
	"log"
	"net/http"
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
		SELECT p.id, yp.id, yp.license_no, cp.id, cp."ytbsApiKey", cp."ytbsUsername", cp."ytbsPassword",
		       p."readingDate", p."readingTime", p."valueMw", p.id
		FROM "YtbsInstantProduction" p
		JOIN "YtbsPlant" yp ON p."ytbsPlantId" = yp.id
		JOIN "Plant" lp ON yp."plantId" = lp.id
		JOIN "CompanyProfile" cp ON lp."companyId" = cp.id
		WHERE p."isSent" = false AND p."retryCount" < 10
		LIMIT 100
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	// In a real implementation we'd group by license and send batch
	// For this port, simplified one-by-one or small batch is fine to start
	for rows.Next() {
		var id, ypID, cpID, prodID uuid.UUID
		var license, apiKey, username, password, date, timeStr string
		var val float64
		
		if err := rows.Scan(&id, &ypID, &license, &cpID, &apiKey, &username, &password, &date, &timeStr, &val, &prodID); err == nil {
			token, err := s.Login(ctx, apiKey, username, password)
			if err != nil { continue }
			
			payload := map[string]interface{}{
				"baglantiAnlasmasiSirketiLisansNo": license,
				"veri": []map[string]interface{}{
					{
						"tarih": date,
						"saat":  timeStr,
						"lisanssizSantralId": ypID,
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
			if resp != nil && resp.StatusCode == http.StatusOK {
				db.Pool.Exec(ctx, `UPDATE "YtbsInstantProduction" SET "isSent" = true, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Successfully sent INSTANT log for license %s", license)
			} else {
				db.Pool.Exec(ctx, `UPDATE "YtbsInstantProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Failed to send INSTANT log for license %s", license)
			}
		}
	}
}

func (s *YtbsService) ProcessPendingHourly() {
	ctx := context.Background()
	rows, err := db.Pool.Query(ctx, `
		SELECT p.id, yp.id, yp.license_no, cp.id, cp."ytbsApiKey", cp."ytbsUsername", cp."ytbsPassword",
		       p."readingDate", p."readingHour", p."valueMwh", p.id
		FROM "YtbsHourlyProduction" p
		JOIN "YtbsPlant" yp ON p."ytbsPlantId" = yp.id
		JOIN "Plant" lp ON yp."plantId" = lp.id
		JOIN "CompanyProfile" cp ON lp."companyId" = cp.id
		WHERE p."isSent" = false AND p."retryCount" < 10
		LIMIT 100
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id, ypID, cpID, prodID uuid.UUID
		var license, apiKey, username, password, date, hourStr string
		var val float64
		
		if err := rows.Scan(&id, &ypID, &license, &cpID, &apiKey, &username, &password, &date, &hourStr, &val, &prodID); err == nil {
			token, err := s.Login(ctx, apiKey, username, password)
			if err != nil { continue }
			
			payload := map[string]interface{}{
				"baglantiAnlasmasiSirketiLisansNo": license,
				"veri": []map[string]interface{}{
					{
						"tarih": date,
						"saat":  hourStr,
						"lisanssizSantralId": ypID,
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
			if resp != nil && resp.StatusCode == http.StatusOK {
				db.Pool.Exec(ctx, `UPDATE "YtbsHourlyProduction" SET "isSent" = true, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Successfully sent HOURLY log for license %s", license)
			} else {
				db.Pool.Exec(ctx, `UPDATE "YtbsHourlyProduction" SET "retryCount" = "retryCount" + 1, "lastAttemptAt" = NOW() WHERE id = $1`, prodID)
				log.Printf("[YTBS] Failed to send HOURLY log for license %s", license)
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

func (s *YtbsService) QueryExternalLogs(ctx context.Context, companyID uuid.UUID, logType string) ([]any, error) {
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

	date := time.Now().Format("2006-01-02")
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
			"tarih": date,
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
			Veri any `json:"veri"`
		}
		json.NewDecoder(resp.Body).Decode(&res)
		resp.Body.Close()

		if res.Veri != nil {
			// If it's an array, append all. If it's a single item, append one.
			if list, ok := res.Veri.([]any); ok {
				allLogs = append(allLogs, list...)
			} else {
				allLogs = append(allLogs, res.Veri)
			}
		}
	}

	return allLogs, nil
}
