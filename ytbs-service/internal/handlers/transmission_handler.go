package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/repository"
	"ytbs-platform/internal/services"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type TransmissionHandler struct {
	logRepo   *repository.LogRepository
	plantRepo *repository.PlantRepository
	worker    *services.TransmissionWorker
}

func NewTransmissionHandler(
	logRepo *repository.LogRepository,
	plantRepo *repository.PlantRepository,
	worker *services.TransmissionWorker,
) *TransmissionHandler {
	return &TransmissionHandler{
		logRepo:   logRepo,
		plantRepo: plantRepo,
		worker:    worker,
	}
}

func (h *TransmissionHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	q := r.URL.Query()
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")
	status := q.Get("status")
	tType := q.Get("type")

	var plantID *uuid.UUID
	if pStr := q.Get("plantId"); pStr != "" {
		if pID, err := uuid.Parse(pStr); err == nil {
			plantID = &pID
		}
	}

	filter := repository.FilterParams{
		StartDate: startDate,
		EndDate:   endDate,
		Status:    status,
		Type:      tType,
		PlantID:   plantID,
		Limit:     200,
	}

	logs, err := h.logRepo.GetLogs(ctx, filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	plants, _ := h.plantRepo.GetAll(ctx, nil)

	data := map[string]interface{}{
		"Title":     "Gönderim & Rapor Ekranı",
		"ActiveNav": "transmissions",
		"User":      user,
		"Logs":      logs,
		"Plants":    plants,
		"Filters":   filter,
	}

	_ = web.RenderTemplate(w, "transmissions.html", data)
}

func (h *TransmissionHandler) UpdateValue(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	val, err := strconv.ParseFloat(r.FormValue("value"), 64)
	if err != nil {
		http.Error(w, "Geçersiz Sayısal Değer", http.StatusBadRequest)
		return
	}

	// 1. Update in local DB
	if err := h.logRepo.ManualUpdateAndRetry(r.Context(), id, val); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Immediately retry sending to TEIAS YTBS
	_ = h.worker.RetryTransmission(r.Context(), id)

	http.Redirect(w, r, "/transmissions", http.StatusSeeOther)
}

func (h *TransmissionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.logRepo.Delete(r.Context(), id)
	http.Redirect(w, r, "/transmissions", http.StatusSeeOther)
}

func (h *TransmissionHandler) Retry(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.worker.RetryTransmission(r.Context(), id)
	http.Redirect(w, r, "/transmissions", http.StatusSeeOther)
}

func (h *TransmissionHandler) TriggerNow(w http.ResponseWriter, r *http.Request) {
	go func() {
		h.worker.ProcessInstantTransmissions(context.Background(), time.Now())
	}()

	// Brief sleep so the user can immediately see the new log upon refresh
	time.Sleep(300 * time.Millisecond)
	http.Redirect(w, r, "/transmissions", http.StatusSeeOther)
}
