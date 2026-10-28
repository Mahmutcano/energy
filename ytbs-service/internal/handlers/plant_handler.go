package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
	"ytbs-platform/internal/services"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type PlantHandler struct {
	plantRepo   *repository.PlantRepository
	companyRepo *repository.CompanyRepository
	ytbsClient  *services.YTBSClient
}

func NewPlantHandler(plantRepo *repository.PlantRepository, companyRepo *repository.CompanyRepository, ytbsClient *services.YTBSClient) *PlantHandler {
	return &PlantHandler{
		plantRepo:   plantRepo,
		companyRepo: companyRepo,
		ytbsClient:  ytbsClient,
	}
}

func (h *PlantHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	var companyID *uuid.UUID
	if user != nil && user.Role != "system_admin" && user.CompanyID != nil {
		companyID = user.CompanyID
	}

	plants, err := h.plantRepo.GetAll(ctx, companyID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	companies, _ := h.companyRepo.GetAll(ctx)

	data := map[string]interface{}{
		"Title":     "Santral Tanımlama",
		"ActiveNav": "plants",
		"User":      user,
		"Plants":    plants,
		"Companies": companies,
		"Success":   r.URL.Query().Get("success"),
		"Error":     r.URL.Query().Get("error"),
	}

	_ = web.RenderTemplate(w, "plants.html", data)
}

func (h *PlantHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	companyID, err := uuid.Parse(r.FormValue("companyId"))
	if err != nil {
		http.Error(w, "Geçersiz Firma", http.StatusBadRequest)
		return
	}

	capacityMW, _ := strconv.ParseFloat(r.FormValue("capacityMw"), 64)
	ytbsPlantID, _ := strconv.Atoi(r.FormValue("ytbsPlantId"))

	plant := &models.Plant{
		CompanyID:   companyID,
		PlantName:   r.FormValue("plantName"),
		PlantType:   r.FormValue("plantType"),
		CapacityMW:  capacityMW,
		YTBSPlantID: ytbsPlantID,
		CanSendYTBS: r.FormValue("canSendYtbs") == "true",
		PeriodType:  r.FormValue("periodType"),
		City:        r.FormValue("city"),
		District:    r.FormValue("district"),
		IsActive:    true,
	}

	if err := h.plantRepo.Create(r.Context(), plant); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/plants", http.StatusSeeOther)
}

func (h *PlantHandler) Update(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	companyID, err := uuid.Parse(r.FormValue("companyId"))
	if err != nil {
		http.Error(w, "Geçersiz Firma", http.StatusBadRequest)
		return
	}

	capacityMW, _ := strconv.ParseFloat(r.FormValue("capacityMw"), 64)
	ytbsPlantID, _ := strconv.Atoi(r.FormValue("ytbsPlantId"))

	plant := &models.Plant{
		ID:          id,
		CompanyID:   companyID,
		PlantName:   r.FormValue("plantName"),
		PlantType:   r.FormValue("plantType"),
		CapacityMW:  capacityMW,
		YTBSPlantID: ytbsPlantID,
		CanSendYTBS: r.FormValue("canSendYtbs") == "true",
		PeriodType:  r.FormValue("periodType"),
		City:        r.FormValue("city"),
		District:    r.FormValue("district"),
		IsActive:    r.FormValue("isActive") == "true",
	}

	if err := h.plantRepo.Update(r.Context(), plant); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/plants", http.StatusSeeOther)
}

func (h *PlantHandler) ToggleYTBS(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	plant, err := h.plantRepo.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Santral bulunamadı", http.StatusNotFound)
		return
	}

	plant.CanSendYTBS = !plant.CanSendYTBS
	_ = h.plantRepo.Update(r.Context(), plant)

	http.Redirect(w, r, "/plants", http.StatusSeeOther)
}

func (h *PlantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.plantRepo.Delete(r.Context(), id)
	http.Redirect(w, r, "/plants", http.StatusSeeOther)
}

// SyncFromTEIAS pulls registered unlicensed plant profiles directly from TEIAS REST web service
func (h *PlantHandler) SyncFromTEIAS(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	companyID, err := uuid.Parse(r.FormValue("companyId"))
	if err != nil {
		http.Error(w, "Geçersiz Firma", http.StatusBadRequest)
		return
	}

	company, err := h.companyRepo.GetByID(r.Context(), companyID)
	if err != nil {
		http.Error(w, "Firma bulunamadı", http.StatusNotFound)
		return
	}

	if company.YTBSApiKey == "" || company.YTBSUsername == "" || company.YTBSPassword == "" {
		http.Redirect(w, r, "/plants?error="+url.QueryEscape("Firmanın TEİAŞ kimlik bilgileri (API Key, Kullanıcı Adı, Şifre) eksik!"), http.StatusSeeOther)
		return
	}

	extPlants, err := h.ytbsClient.ListExternalPlants(r.Context(), company.YTBSApiKey, company.YTBSUsername, company.YTBSPassword, "")
	if err != nil {
		http.Redirect(w, r, "/plants?error="+url.QueryEscape("TEİAŞ bağlantı hatası: "+err.Error()), http.StatusSeeOther)
		return
	}

	existingPlants, _ := h.plantRepo.GetAll(r.Context(), &companyID)
	existingMap := make(map[int]bool)
	for _, p := range existingPlants {
		existingMap[p.YTBSPlantID] = true
	}

	addedCount := 0
	for _, ep := range extPlants {
		ytbsID := 0
		if idVal, ok := ep["id"]; ok {
			if f, ok := idVal.(float64); ok {
				ytbsID = int(f)
			} else if s, ok := idVal.(string); ok {
				ytbsID, _ = strconv.Atoi(s)
			}
		} else if idVal, ok := ep["lisanssizSantralId"]; ok {
			if f, ok := idVal.(float64); ok {
				ytbsID = int(f)
			}
		}

		if ytbsID == 0 || existingMap[ytbsID] {
			continue
		}

		name := "TEİAŞ Lisanssız Santral #" + strconv.Itoa(ytbsID)
		if n, ok := ep["ad"].(string); ok && n != "" {
			name = n
		} else if n, ok := ep["santralAdi"].(string); ok && n != "" {
			name = n
		}

		capacity := 1.0
		if tarihce, ok := ep["tarihce"].(map[string]interface{}); ok {
			if g, ok := tarihce["acGucu"].(float64); ok && g > 0 {
				capacity = g
			}
		} else if g, ok := ep["kuruluGuc"].(float64); ok && g > 0 {
			capacity = g
		}

		pType := "SOLAR"
		upperName := strings.ToUpper(name)
		if strings.Contains(upperName, "RES") || strings.Contains(upperName, "RÜZGAR") {
			pType = "WIND"
		} else if strings.Contains(upperName, "HES") || strings.Contains(upperName, "HİDRO") {
			pType = "HYDRO"
		}

		newPlant := &models.Plant{
			CompanyID:   companyID,
			PlantName:   name,
			PlantType:   pType,
			CapacityMW:  capacity,
			YTBSPlantID: ytbsID,
			CanSendYTBS: true,
			PeriodType:  "15_MIN_AND_1_HOUR",
			City:        "Merkez",
			District:    "-",
			IsActive:    true,
		}

		if err := h.plantRepo.Create(r.Context(), newPlant); err == nil {
			addedCount++
			existingMap[ytbsID] = true
		}
	}

	msg := fmt.Sprintf("TEİAŞ senkronizasyonu tamamlandı. %d yeni santral aktarıldı (Toplam TEİAŞ kaydı: %d).", addedCount, len(extPlants))
	http.Redirect(w, r, "/plants?success="+url.QueryEscape(msg), http.StatusSeeOther)
}
