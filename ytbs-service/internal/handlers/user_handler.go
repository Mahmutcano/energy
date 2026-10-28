package handlers

import (
	"net/http"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type UserHandler struct {
	userRepo    *repository.UserRepository
	companyRepo *repository.CompanyRepository
}

func NewUserHandler(userRepo *repository.UserRepository, companyRepo *repository.CompanyRepository) *UserHandler {
	return &UserHandler{
		userRepo:    userRepo,
		companyRepo: companyRepo,
	}
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	currentUser := middleware.GetCurrentUser(r)

	users, err := h.userRepo.GetAll(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	companies, _ := h.companyRepo.GetAll(ctx)

	data := map[string]interface{}{
		"Title":     "Kullanıcı Yönetimi",
		"ActiveNav": "users",
		"User":      currentUser,
		"Users":     users,
		"Companies": companies,
	}

	_ = web.RenderTemplate(w, "users.html", data)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var companyID *uuid.UUID
	companyIDStr := r.FormValue("companyId")
	if companyIDStr != "" {
		if parsed, err := uuid.Parse(companyIDStr); err == nil {
			companyID = &parsed
		}
	}

	user := &models.User{
		CompanyID: companyID,
		Username:  r.FormValue("username"),
		FullName:  r.FormValue("fullName"),
		Email:     r.FormValue("email"),
		Role:      r.FormValue("role"),
		IsActive:  true,
	}

	rawPassword := r.FormValue("password")
	if err := h.userRepo.Create(r.Context(), user, rawPassword); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/users", http.StatusSeeOther)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.userRepo.Delete(r.Context(), id)
	http.Redirect(w, r, "/users", http.StatusSeeOther)
}
