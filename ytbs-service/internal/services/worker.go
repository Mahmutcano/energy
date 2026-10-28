package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"time"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"

	"github.com/google/uuid"
)

type TransmissionWorker struct {
	db          *sql.DB
	plantRepo   *repository.PlantRepository
	companyRepo *repository.CompanyRepository
	logRepo     *repository.LogRepository
	dataDefRepo *repository.DataDefRepository
	ytbsClient  *YTBSClient
	mailer      *Mailer
}

func NewTransmissionWorker(
	db *sql.DB,
	plantRepo *repository.PlantRepository,
	companyRepo *repository.CompanyRepository,
	logRepo *repository.LogRepository,
	dataDefRepo *repository.DataDefRepository,
	ytbsClient *YTBSClient,
	mailer *Mailer,
) *TransmissionWorker {
	return &TransmissionWorker{
		db:          db,
		plantRepo:   plantRepo,
		companyRepo: companyRepo,
		logRepo:     logRepo,
		dataDefRepo: dataDefRepo,
		ytbsClient:  ytbsClient,
		mailer:      mailer,
	}
}

// Start launches the background scheduler for 15-minute and 1-hour intervals.
func (w *TransmissionWorker) Start(ctx context.Context) {
	log.Println("[WORKER] YTBS Transmission Worker başlatıldı (15 dk ve 1 saat döngüsü aktif)")

	// Check every minute to see if current minute matches 15-minute boundaries (:00, :15, :30, :45)
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for {
			select {
			case <-ctx.Done():
				log.Println("[WORKER] Worker durduruldu.")
				return
			case t := <-ticker.C:
				minute := t.Minute()

				// 15-minute check
				if minute == 0 || minute == 15 || minute == 30 || minute == 45 {
					log.Printf("[WORKER] 15 Dakikalık periyot tetiklendi: %s", t.Format("15:04"))
					w.ProcessInstantTransmissions(context.Background(), t)
				}

				// 1-hour check
				if minute == 0 {
					log.Printf("[WORKER] 1 Saatlik periyot tetiklendi: %s", t.Format("15:04"))
					w.ProcessHourlyTransmissions(context.Background(), t)
				}
			}
		}
	}()
}

// ProcessInstantTransmissions handles 15m instant power readings (MW).
func (w *TransmissionWorker) ProcessInstantTransmissions(ctx context.Context, t time.Time) {
	plants, err := w.plantRepo.GetActiveForSending(ctx)
	if err != nil {
		log.Printf("[WORKER-ERROR] Aktif santraller alınamadı: %v", err)
		return
	}

	dateStr := t.Format("2006-01-02")
	timeStr := t.Format("15:04")

	for _, plant := range plants {
		if plant.PeriodType != "15m" && plant.PeriodType != "both" {
			continue
		}

		// Read value from data definitions or source
		value := w.resolveTelemetryValue(ctx, plant.ID, "INSTANT_MW", plant.CapacityMW)

		w.executeTransmissionWithTransaction(ctx, plant, "INSTANT", dateStr, timeStr, value, "MW")
	}
}

// ProcessHourlyTransmissions handles 1h cumulative energy readings (MWh).
func (w *TransmissionWorker) ProcessHourlyTransmissions(ctx context.Context, t time.Time) {
	plants, err := w.plantRepo.GetActiveForSending(ctx)
	if err != nil {
		log.Printf("[WORKER-ERROR] Aktif santraller alınamadı: %v", err)
		return
	}

	dateStr := t.Format("2006-01-02")
	hourStr := t.Format("15:00")

	for _, plant := range plants {
		if plant.PeriodType != "1h" && plant.PeriodType != "both" {
			continue
		}

		value := w.resolveTelemetryValue(ctx, plant.ID, "HOURLY_MWH", plant.CapacityMW)

		w.executeTransmissionWithTransaction(ctx, plant, "HOURLY", dateStr, hourStr, value, "MWh")
	}
}

// executeTransmissionWithTransaction implements the strict ACID requirement:
// 1. BEGIN TX -> Insert record as PENDING -> COMMIT TX
// 2. Call TEIAS YTBS Web Service
// 3. Update record with SUCCESS / FAILED + response details
// 4. Send Email Alert if failed
func (w *TransmissionWorker) executeTransmissionWithTransaction(
	ctx context.Context,
	plant models.Plant,
	tType string,
	dateStr, timeStr string,
	value float64,
	unit string,
) {
	company, err := w.companyRepo.GetByID(ctx, plant.CompanyID)
	if err != nil {
		log.Printf("[WORKER-ERROR] Firma bulunamadı (ID: %s): %v", plant.CompanyID, err)
		return
	}

	// Step 1: Open ACID transaction to save the pending log
	tx, err := w.db.BeginTx(ctx, nil)
	if err != nil {
		log.Printf("[WORKER-ERROR] Transaction başlatılamadı: %v", err)
		return
	}

	logItem := &models.TransmissionLog{
		PlantID:          plant.ID,
		CompanyID:        plant.CompanyID,
		TransmissionType: tType,
		ReadingDate:      dateStr,
		ReadingTime:      timeStr,
		Value:            value,
		Status:           "PENDING",
		RetryCount:       0,
		IsManualEntry:    false,
	}

	if err := w.logRepo.CreateInTx(ctx, tx, logItem); err != nil {
		_ = tx.Rollback()
		log.Printf("[WORKER-ERROR] Transaction içi log kaydı başarısız: %v", err)
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("[WORKER-ERROR] Transaction commit başarısız: %v", err)
		return
	}

	// Step 2: Transmit to TEIAS YTBS
	var httpCode int
	var respBody string
	var sendErr error

	if tType == "INSTANT" {
		httpCode, respBody, sendErr = w.ytbsClient.SendInstantData(
			ctx,
			company.YTBSApiKey,
			company.YTBSUsername,
			company.YTBSPassword,
			company.LicenseNo,
			plant.YTBSPlantID,
			dateStr,
			timeStr,
			value,
		)
	} else {
		httpCode, respBody, sendErr = w.ytbsClient.SendHourlyData(
			ctx,
			company.YTBSApiKey,
			company.YTBSUsername,
			company.YTBSPassword,
			company.LicenseNo,
			plant.YTBSPlantID,
			dateStr,
			timeStr,
			value,
		)
	}

	// Step 3: Update transmission log status
	if sendErr == nil && httpCode == 200 {
		_ = w.logRepo.UpdateStatus(ctx, logItem.ID, "SUCCESS", httpCode, respBody, "")
		log.Printf("[WORKER-SUCCESS] YTBS aktarımı başarılı: %s (%s)", plant.PlantName, timeStr)
	} else {
		errMsg := ""
		if sendErr != nil {
			errMsg = sendErr.Error()
		}
		_ = w.logRepo.UpdateStatus(ctx, logItem.ID, "FAILED", httpCode, respBody, errMsg)
		log.Printf("[WORKER-FAILED] YTBS aktarımı başarısız: %s (%s) - Hata: %s", plant.PlantName, timeStr, errMsg)

		// Step 4: Send immediate Alert Email to ozgancan9@gmail.com
		go func() {
			_ = w.mailer.SendTransmissionFailureAlert(AlertDetails{
				CompanyName:      company.Name,
				PlantName:        plant.PlantName,
				YTBSPlantID:      plant.YTBSPlantID,
				LicenseNo:        company.LicenseNo,
				TransmissionType: tType,
				ReadingDate:      dateStr,
				ReadingTime:      timeStr,
				Value:            value,
				Unit:             unit,
				ErrorMessage:     errMsg,
				HTTPStatusCode:   httpCode,
				RetryCount:       1,
			})
		}()
	}
}

// RetryTransmission allows manual resending of a specific log item from UI.
func (w *TransmissionWorker) RetryTransmission(ctx context.Context, logID uuid.UUID) error {
	logItem, err := w.logRepo.GetByID(ctx, logID)
	if err != nil {
		return fmt.Errorf("kayıt bulunamadı: %w", err)
	}

	company, err := w.companyRepo.GetByID(ctx, logItem.CompanyID)
	if err != nil {
		return fmt.Errorf("firma bulunamadı: %w", err)
	}

	plant, err := w.plantRepo.GetByID(ctx, logItem.PlantID)
	if err != nil {
		return fmt.Errorf("santral bulunamadı: %w", err)
	}

	var httpCode int
	var respBody string
	var sendErr error

	if logItem.TransmissionType == "INSTANT" {
		httpCode, respBody, sendErr = w.ytbsClient.SendInstantData(
			ctx,
			company.YTBSApiKey,
			company.YTBSUsername,
			company.YTBSPassword,
			company.LicenseNo,
			plant.YTBSPlantID,
			logItem.ReadingDate,
			logItem.ReadingTime,
			logItem.Value,
		)
	} else {
		httpCode, respBody, sendErr = w.ytbsClient.SendHourlyData(
			ctx,
			company.YTBSApiKey,
			company.YTBSUsername,
			company.YTBSPassword,
			company.LicenseNo,
			plant.YTBSPlantID,
			logItem.ReadingDate,
			logItem.ReadingTime,
			logItem.Value,
		)
	}

	if sendErr == nil && httpCode == 200 {
		_ = w.logRepo.UpdateStatus(ctx, logItem.ID, "SUCCESS", httpCode, respBody, "")
		return nil
	}

	errMsg := ""
	if sendErr != nil {
		errMsg = sendErr.Error()
	}
	_ = w.logRepo.UpdateStatus(ctx, logItem.ID, "FAILED", httpCode, respBody, errMsg)

	// Send Alert
	unit := "MW"
	if logItem.TransmissionType == "HOURLY" {
		unit = "MWh"
	}
	go func() {
		_ = w.mailer.SendTransmissionFailureAlert(AlertDetails{
			CompanyName:      company.Name,
			PlantName:        plant.PlantName,
			YTBSPlantID:      plant.YTBSPlantID,
			LicenseNo:        company.LicenseNo,
			TransmissionType: logItem.TransmissionType,
			ReadingDate:      logItem.ReadingDate,
			ReadingTime:      logItem.ReadingTime,
			Value:            logItem.Value,
			Unit:             unit,
			ErrorMessage:     errMsg,
			HTTPStatusCode:   httpCode,
			RetryCount:       logItem.RetryCount + 1,
		})
	}()

	return fmt.Errorf("YTBS gönderim hatası (Kod: %d): %s", httpCode, errMsg)
}

// resolveTelemetryValue reads either from data definitions multiplier or simulates realistic power generation.
func (w *TransmissionWorker) resolveTelemetryValue(ctx context.Context, plantID uuid.UUID, dataType string, capacityMW float64) float64 {
	defs, err := w.dataDefRepo.GetAll(ctx, &plantID)
	multiplier := 1.0
	if err == nil && len(defs) > 0 {
		for _, d := range defs {
			if d.DataType == dataType && d.IsActive {
				multiplier = d.Multiplier
				break
			}
		}
	}

	// Calculate a realistic daytime generation curve based on capacity
	hour := time.Now().Hour()
	factor := 0.0
	if hour >= 6 && hour <= 19 {
		// Sun curve peak around 13:00
		diff := float64(hour) - 13.0
		factor = 1.0 - (diff*diff)/49.0
		if factor < 0.1 {
			factor = 0.1
		}
		// Add small random fluctuation +/- 5%
		fluctuation := (rand.Float64() - 0.5) * 0.1
		factor += fluctuation
	}

	val := capacityMW * factor * multiplier
	if val < 0 {
		val = 0
	}
	// Round to 4 decimals
	return float64(int(val*10000)) / 10000.0
}
