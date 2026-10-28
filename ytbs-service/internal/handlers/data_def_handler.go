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

type DataDefHandler struct {
	dataDefRepo *repository.DataDefRepository
	plantRepo   *repository.PlantRepository
}

func NewDataDefHandler(dataDefRepo *repository.DataDefRepository, plantRepo *repository.PlantRepository) *DataDefHandler {
	return &DataDefHandler{
		dataDefRepo: dataDefRepo,
		plantRepo:   plantRepo,
	}
}

func (h *DataDefHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	defs, err := h.dataDefRepo.GetAll(ctx, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	plants, _ := h.plantRepo.GetAll(ctx, nil)

	data := map[string]interface{}{
		"Title":     "Veri & Tag Tanımlama",
		"ActiveNav": "data_definitions",
		"User":      user,
		"Defs":      defs,
		"Plants":    plants,
	}

	_ = web.RenderTemplate(w, "data_definitions.html", data)
}

func (h *DataDefHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	plantID, err := uuid.Parse(r.FormValue("plantId"))
	if err != nil {
		http.Error(w, "Geçersiz Santral", http.StatusBadRequest)
		return
	}

	multiplier, _ := strconv.ParseFloat(r.FormValue("multiplier"), 64)
	if multiplier == 0 {
		multiplier = 1.0
	}

	def := &models.DataDefinition{
		PlantID:           plantID,
		ParameterName:     r.FormValue("parameterName"),
		DataType:          r.FormValue("dataType"),
		Unit:              r.FormValue("unit"),
		SourceTagOrColumn: r.FormValue("sourceTagOrColumn"),
		Multiplier:        multiplier,
		IsActive:          true,
	}

	if err := h.dataDefRepo.Create(r.Context(), def); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/data-definitions", http.StatusSeeOther)
}

func (h *DataDefHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.dataDefRepo.Delete(r.Context(), id)
	http.Redirect(w, r, "/data-definitions", http.StatusSeeOther)
}
