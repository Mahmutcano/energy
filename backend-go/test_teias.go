package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TokenResponse struct {
	Veri struct {
		Jeton string `json:"jeton"`
	} `json:"veri"`
	Jeton   string `json:"jeton"`
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func main() {
	pool, err := pgxpool.New(context.Background(), "postgresql://postgres:SDDyuSvBSUVpZTFLoLunxKSevXAnLHrD@mainline.proxy.rlwy.net:21430/railway")
	if err != nil { log.Fatal(err) }
	defer pool.Close()

	var apiKey, username, password string
	err = pool.QueryRow(context.Background(), `SELECT "ytbsApiKey", "ytbsUsername", "ytbsPassword" FROM "CompanyProfile" WHERE id='cea43969-9a37-4073-a025-cdfba183cf77'`).Scan(&apiKey, &username, &password)
	if err != nil { log.Fatal(err) }

	payloadLogin := map[string]string{"kullaniciAdi": username, "sifre": password}
	bLogin, _ := json.Marshal(payloadLogin)
	reqL, _ := http.NewRequest("POST", "https://ytbsws.teias.gov.tr/ytbs-webservis/rest/yetkilendirme/login", bytes.NewBuffer(bLogin))
	reqL.Header.Set("Content-Type", "application/json")
	reqL.Header.Set("SERVICE_KEY", apiKey)
	respL, err := http.DefaultClient.Do(reqL)
	if err != nil { log.Fatal(err) }
	defer respL.Body.Close()
	var tRes TokenResponse
	json.NewDecoder(respL.Body).Decode(&tRes)
	token := tRes.Veri.Jeton
	if token == "" { token = tRes.Jeton }

	payload := map[string]interface{}{
		"baglantiAnlasmasiSirketiLisansNo": "ED-OSB/1836-1/1305",
		"veri": []map[string]interface{}{
			{
				"tarih": "2026-05-07",
				"saat":  "00:15",
				"lisanssizSantralId": 25924,
				"veriDeger": 3,
			},
		},
	}
	b, _ := json.Marshal(payload)
	fmt.Printf("Payload: %s\n", string(b))
	req, _ := http.NewRequest("POST", "https://ytbsws.teias.gov.tr/ytbs-webservis/rest/veritoplama/anliklisanssizsantralarz/ekle", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("SERVICE_KEY", apiKey)
	req.Header.Set("AUTH_TOKEN", token)
	resp, _ := http.DefaultClient.Do(req)
	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	resp.Body.Close()
	fmt.Printf("Status: %d\nResponse: %+v\n", resp.StatusCode, res)
}
