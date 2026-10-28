package handlers

import (
	"net/http"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type DashboardHandler struct {
	logRepo *repository.LogRepository
}

func NewDashboardHandler(logRepo *repository.LogRepository) *DashboardHandler {
	return &DashboardHandler{logRepo: logRepo}
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

	data := map[string]interface{}{
		"Title":      "Gösterge Paneli",
		"ActiveNav":  "dashboard",
		"User":       user,
		"Stats":      stats,
		"RecentLogs": recentLogs,
	}

	_ = web.RenderTemplate(w, "dashboard.html", data)
}
