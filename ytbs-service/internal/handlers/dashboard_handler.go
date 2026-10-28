package handlers

import (
	"net/http"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/repository"
	"ytbs-platform/internal/services"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type DashboardHandler struct {
	logRepo *repository.LogRepository
	worker  *services.TransmissionWorker
}

func NewDashboardHandler(logRepo *repository.LogRepository, worker *services.TransmissionWorker) *DashboardHandler {
	return &DashboardHandler{logRepo: logRepo, worker: worker}
}

func (h *DashboardHandler) ShowDashboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	var companyID *uuid.UUID
	if user != nil && user.Role != "system_admin" && user.CompanyID != nil {
		companyID = user.CompanyID
	}

	stats, err := h.logRepo.GetDashboardStats(ctx, companyID)
	if err != nil {
		stats = nil
	}

	recentLogs, _ := h.logRepo.GetLogs(ctx, repository.FilterParams{
		CompanyID: companyID,
		Limit:     10,
	})

	sourceDBStatus, sourceDBErr := h.worker.GetSourceDBStatus()

	data := map[string]interface{}{
		"Title":          "Gösterge Paneli",
		"ActiveNav":      "dashboard",
		"User":           user,
		"Stats":          stats,
		"RecentLogs":     recentLogs,
		"SourceDBStatus": sourceDBStatus,
		"SourceDBError":  sourceDBErr,
	}

	if err := web.RenderTemplate(w, "dashboard.html", data); err != nil {
		http.Error(w, "Şablon hatası: "+err.Error(), http.StatusInternalServerError)
	}
}
