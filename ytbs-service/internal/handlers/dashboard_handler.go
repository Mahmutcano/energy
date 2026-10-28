package handlers

import (
	"net/http"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"
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

	stats, err := h.logRepo.GetDashboardStats(ctx)
	if err != nil {
		stats = nil
	}

	recentLogs, _ := h.logRepo.GetLogs(ctx, repository.FilterParams{
		Limit: 10,
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
