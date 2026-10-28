package handlers

import (
	"net/http"
	"strconv"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type PlantHandler struct {
	plantRepo   *repository.PlantRepository
	companyRepo *repository.CompanyRepository
}

func NewPlantHandler(plantRepo *repository.PlantRepository, companyRepo *repository.CompanyRepository) *PlantHandler {
	return &PlantHandler{
		plantRepo:   plantRepo,
		companyRepo: companyRepo,
	}
}

func (h *PlantHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	var companyID *uuid.UUID
	if user != nil && user.Role != "super_admin" && user.CompanyID != nil {
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
