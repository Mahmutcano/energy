package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

const YtbsBaseURL = "https://ytbsws.teias.gov.tr/ytbs-webservis/rest"

type YTBSClient struct {
	httpClient *http.Client
}

func NewYTBSClient() *YTBSClient {
	return &YTBSClient{
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

type tokenResponse struct {
	Veri struct {
		Jeton string `json:"jeton"`
	} `json:"veri"`
	Jeton   string `json:"jeton"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// LoginWithDetails obtains a session token from TEIAS YTBS along with HTTP status code and response body.
func (c *YTBSClient) LoginWithDetails(ctx context.Context, apiKey, username, password string) (string, int, string, error) {
	if apiKey == "" || username == "" || password == "" {
		return "", 400, `{"error":"Kimlik bilgileri eksik"}`, fmt.Errorf("YTBS kimlik bilgileri eksik (API Key, Kullanıcı Adı veya Şifre boş)")
	}

	payload := map[string]string{
		"kullaniciAdi": username,
		"sifre":        password,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/yetkilendirme/login", bytes.NewBuffer(body))
	if err != nil {
		return "", 0, "", fmt.Errorf("login isteği oluşturulamadı: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", 0, "", fmt.Errorf("TEİAŞ YTBS bağlantı hatası (timeout/network): %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	respStr := string(respBytes)

	if resp.StatusCode != http.StatusOK {
		return "", resp.StatusCode, respStr, fmt.Errorf("YTBS Login başarısız! HTTP Kod: %d, Yanıt: %s", resp.StatusCode, respStr)
	}

	var res tokenResponse
	if err := json.Unmarshal(respBytes, &res); err != nil {
		return "", resp.StatusCode, respStr, fmt.Errorf("YTBS yanıtı json olarak çözülemedi: %w", err)
	}

	token := res.Veri.Jeton
	if token == "" {
		token = res.Jeton
	}

	if token == "" {
		return "", resp.StatusCode, respStr, fmt.Errorf("YTBS geçerli bir jeton (token) dönmedi: %s", respStr)
	}

	return token, resp.StatusCode, respStr, nil
}

// Login obtains a session token (jeton) from TEIAS YTBS.
func (c *YTBSClient) Login(ctx context.Context, apiKey, username, password string) (string, error) {
	token, _, _, err := c.LoginWithDetails(ctx, apiKey, username, password)
	return token, err
}

// SendInstantDataWithToken sends instant data using an explicit token.
func (c *YTBSClient) SendInstantDataWithToken(ctx context.Context, apiKey, token, licenseNo string, ytbsPlantID int, dateStr, timeStr string, valueMw float64) (int, string, error) {
	payload := map[string]interface{}{
		"baglantiAnlasmasiSirketiLisansNo": licenseNo,
		"veri": []map[string]interface{}{
			{
				"tarih":              dateStr,
				"saat":               timeStr,
				"lisanssizSantralId": ytbsPlantID,
				"veriDeger":          valueMw,
			},
		},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/veritoplama/anliklisanssizsantralarz/ekle", bytes.NewBuffer(body))
	if err != nil {
		return 0, "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("veri gönderimi sırasında ağ hatası: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	respStr := string(respBytes)

	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, respStr, fmt.Errorf("YTBS anlık veri aktarım hatası! HTTP %d: %s", resp.StatusCode, respStr)
	}

	log.Printf("[YTBS-CLIENT] Anlık veri başarıyla gönderildi: Santral %d, %s %s, Değer: %.4f MW", ytbsPlantID, dateStr, timeStr, valueMw)
	return resp.StatusCode, respStr, nil
}

// SendInstantDataWithAutoRefresh sends instant data using currentToken; if invalid or expired, re-authenticates, saves token via callback, and retries.
func (c *YTBSClient) SendInstantDataWithAutoRefresh(
	ctx context.Context,
	apiKey, username, password, currentToken, licenseNo string,
	ytbsPlantID int,
	dateStr, timeStr string,
	valueMw float64,
	onTokenRefreshed func(newToken string) error,
) (int, string, error) {
	activeToken := currentToken
	if activeToken == "" {
		newToken, code, body, err := c.LoginWithDetails(ctx, apiKey, username, password)
		if err != nil {
			return code, body, err
		}
		activeToken = newToken
		if onTokenRefreshed != nil {
			_ = onTokenRefreshed(newToken)
		}
	}

	code, body, err := c.SendInstantDataWithToken(ctx, apiKey, activeToken, licenseNo, ytbsPlantID, dateStr, timeStr, valueMw)
	// Check if token was rejected or expired
	if code == http.StatusUnauthorized || code == http.StatusForbidden || strings.Contains(strings.ToLower(body), "jeton") || strings.Contains(strings.ToLower(body), "token") {
		log.Printf("[YTBS-CLIENT] Anlık iletim: Jeton geçersiz/süresi dolmuş görünüyor (HTTP %d). Otomatik login yenileniyor...", code)
		newToken, loginCode, loginBody, loginErr := c.LoginWithDetails(ctx, apiKey, username, password)
		if loginErr != nil {
			return loginCode, loginBody, loginErr
		}
		if onTokenRefreshed != nil {
			_ = onTokenRefreshed(newToken)
		}
		return c.SendInstantDataWithToken(ctx, apiKey, newToken, licenseNo, ytbsPlantID, dateStr, timeStr, valueMw)
	}

	return code, body, err
}

// SendInstantData transmits 15-minute telemetry (MW) to TEIAS (backwards-compatible wrapper).
func (c *YTBSClient) SendInstantData(ctx context.Context, apiKey, username, password, licenseNo string, ytbsPlantID int, dateStr, timeStr string, valueMw float64) (int, string, error) {
	return c.SendInstantDataWithAutoRefresh(ctx, apiKey, username, password, "", licenseNo, ytbsPlantID, dateStr, timeStr, valueMw, nil)
}

// SendHourlyDataWithToken sends hourly data using an explicit token.
func (c *YTBSClient) SendHourlyDataWithToken(ctx context.Context, apiKey, token, licenseNo string, ytbsPlantID int, dateStr, hourStr string, valueMwh float64) (int, string, error) {
	payload := map[string]interface{}{
		"baglantiAnlasmasiSirketiLisansNo": licenseNo,
		"veri": []map[string]interface{}{
			{
				"tarih":              dateStr,
				"saat":               hourStr,
				"lisanssizSantralId": ytbsPlantID,
				"veriDeger":          valueMwh,
			},
		},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/veritoplama/saatliklisanssizsantraluretim/ekle", bytes.NewBuffer(body))
	if err != nil {
		return 0, "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, "", fmt.Errorf("saatlik veri gönderimi sırasında ağ hatası: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	respStr := string(respBytes)

	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, respStr, fmt.Errorf("YTBS saatlik veri aktarım hatası! HTTP %d: %s", resp.StatusCode, respStr)
	}

	log.Printf("[YTBS-CLIENT] Saatlik veri başarıyla gönderildi: Santral %d, %s %s, Değer: %.4f MWh", ytbsPlantID, dateStr, hourStr, valueMwh)
	return resp.StatusCode, respStr, nil
}

// SendHourlyDataWithAutoRefresh sends hourly data using currentToken; if invalid or expired, re-authenticates, saves token via callback, and retries.
func (c *YTBSClient) SendHourlyDataWithAutoRefresh(
	ctx context.Context,
	apiKey, username, password, currentToken, licenseNo string,
	ytbsPlantID int,
	dateStr, hourStr string,
	valueMwh float64,
	onTokenRefreshed func(newToken string) error,
) (int, string, error) {
	activeToken := currentToken
	if activeToken == "" {
		newToken, code, body, err := c.LoginWithDetails(ctx, apiKey, username, password)
		if err != nil {
			return code, body, err
		}
		activeToken = newToken
		if onTokenRefreshed != nil {
			_ = onTokenRefreshed(newToken)
		}
	}

	code, body, err := c.SendHourlyDataWithToken(ctx, apiKey, activeToken, licenseNo, ytbsPlantID, dateStr, hourStr, valueMwh)
	// Check if token was rejected or expired
	if code == http.StatusUnauthorized || code == http.StatusForbidden || strings.Contains(strings.ToLower(body), "jeton") || strings.Contains(strings.ToLower(body), "token") {
		log.Printf("[YTBS-CLIENT] Saatlik iletim: Jeton geçersiz/süresi dolmuş görünüyor (HTTP %d). Otomatik login yenileniyor...", code)
		newToken, loginCode, loginBody, loginErr := c.LoginWithDetails(ctx, apiKey, username, password)
		if loginErr != nil {
			return loginCode, loginBody, loginErr
		}
		if onTokenRefreshed != nil {
			_ = onTokenRefreshed(newToken)
		}
		return c.SendHourlyDataWithToken(ctx, apiKey, newToken, licenseNo, ytbsPlantID, dateStr, hourStr, valueMwh)
	}

	return code, body, err
}

// SendHourlyData transmits 1-hour total production (MWh) to TEIAS (backwards-compatible wrapper).
func (c *YTBSClient) SendHourlyData(ctx context.Context, apiKey, username, password, licenseNo string, ytbsPlantID int, dateStr, hourStr string, valueMwh float64) (int, string, error) {
	return c.SendHourlyDataWithAutoRefresh(ctx, apiKey, username, password, "", licenseNo, ytbsPlantID, dateStr, hourStr, valueMwh, nil)
}

// TestCredentials tests whether login succeeds with given company credentials.
func (c *YTBSClient) TestCredentials(ctx context.Context, apiKey, username, password string) (bool, string, error) {
	token, err := c.Login(ctx, apiKey, username, password)
	if err != nil {
		return false, "", err
	}
	return true, token, nil
}

// ListExternalPlants queries the plant list registered to the company at TEIAS YTBS.
func (c *YTBSClient) ListExternalPlants(ctx context.Context, apiKey, username, password, dateStr string) ([]map[string]interface{}, error) {
	token, err := c.Login(ctx, apiKey, username, password)
	if err != nil {
		return nil, err
	}

	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	payload := map[string]string{
		"tarih": dateStr,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/modelleme/uretim/lisanssizsantral/listele", bytes.NewBuffer(body))
	if err != nil {
		return nil, fmt.Errorf("TEİAŞ santral listeleme isteği oluşturulamadı: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("TEİAŞ santral listeleme ağ hatası: %w", err)
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TEİAŞ santral listeleme hatası (HTTP %d): %s", resp.StatusCode, string(respBytes))
	}

	var res struct {
		Basarili bool                     `json:"basarili"`
		Mesaj    []string                 `json:"mesaj"`
		Veri     []map[string]interface{} `json:"veri"`
	}
	if err := json.Unmarshal(respBytes, &res); err != nil {
		// Fallback for different JSON envelope
		var rawMap map[string]interface{}
		if err2 := json.Unmarshal(respBytes, &rawMap); err2 == nil {
			if vList, ok := rawMap["veri"].([]interface{}); ok {
				var converted []map[string]interface{}
				for _, itm := range vList {
					if m, ok := itm.(map[string]interface{}); ok {
						converted = append(converted, m)
					}
				}
				return converted, nil
			}
		}
		return nil, fmt.Errorf("TEİAŞ santral listesi ayrıştırılamadı: %w", err)
	}

	return res.Veri, nil
}

// QuerySentInstantData queries sent 15-minute telemetry data from TEIAS.
func (c *YTBSClient) QuerySentInstantData(ctx context.Context, apiKey, username, password, licenseNo string, ytbsPlantID int, dateStr string) ([]map[string]interface{}, error) {
	token, err := c.Login(ctx, apiKey, username, password)
	if err != nil {
		return nil, err
	}

	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	payload := map[string]interface{}{
		"lisanssizSantralId":               ytbsPlantID,
		"baglantiAnlasmasiSirketiLisansNo": licenseNo,
		"tarih":                            dateStr,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/veritoplama/anliklisanssizsantralarz/sorgula", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TEİAŞ anlık sorgu hatası (HTTP %d): %s", resp.StatusCode, string(respBytes))
	}

	var res struct {
		Veri []map[string]interface{} `json:"veri"`
	}
	if err := json.Unmarshal(respBytes, &res); err == nil && len(res.Veri) > 0 {
		return res.Veri, nil
	}

	var genericRes map[string]interface{}
	_ = json.Unmarshal(respBytes, &genericRes)
	if vList, ok := genericRes["veri"].([]interface{}); ok {
		var list []map[string]interface{}
		for _, v := range vList {
			if m, ok := v.(map[string]interface{}); ok {
				list = append(list, m)
			}
		}
		return list, nil
	}

	return []map[string]interface{}{}, nil
}

// QuerySentHourlyData queries sent 1-hour telemetry data from TEIAS.
func (c *YTBSClient) QuerySentHourlyData(ctx context.Context, apiKey, username, password, licenseNo string, ytbsPlantID int, dateStr string) ([]map[string]interface{}, error) {
	token, err := c.Login(ctx, apiKey, username, password)
	if err != nil {
		return nil, err
	}

	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	payload := map[string]interface{}{
		"lisanssizSantralId":               ytbsPlantID,
		"baglantiAnlasmasiSirketiLisansNo": licenseNo,
		"tarih":                            dateStr,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", YtbsBaseURL+"/veritoplama/saatliklisanssizsantraluretim/sorgula", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TEİAŞ saatlik sorgu hatası (HTTP %d): %s", resp.StatusCode, string(respBytes))
	}

	var res struct {
		Veri []map[string]interface{} `json:"veri"`
	}
	if err := json.Unmarshal(respBytes, &res); err == nil && len(res.Veri) > 0 {
		return res.Veri, nil
	}

	var genericRes map[string]interface{}
	_ = json.Unmarshal(respBytes, &genericRes)
	if vList, ok := genericRes["veri"].([]interface{}); ok {
		var list []map[string]interface{}
		for _, v := range vList {
			if m, ok := v.(map[string]interface{}); ok {
				list = append(list, m)
			}
		}
		return list, nil
	}

	return []map[string]interface{}{}, nil
}
