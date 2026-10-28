package handlers

import (
	"encoding/json"
	"net/http"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
	"ytbs-platform/internal/services"
	"ytbs-platform/web"

	"github.com/google/uuid"
)

type CompanyHandler struct {
	companyRepo *repository.CompanyRepository
	ytbsClient  *services.YTBSClient
}

func NewCompanyHandler(companyRepo *repository.CompanyRepository, ytbsClient *services.YTBSClient) *CompanyHandler {
	return &CompanyHandler{
		companyRepo: companyRepo,
		ytbsClient:  ytbsClient,
	}
}

func (h *CompanyHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetCurrentUser(r)

	companies, err := h.companyRepo.GetAll(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := map[string]interface{}{
		"Title":     "Firma Tanımlama",
		"ActiveNav": "companies",
		"User":      user,
		"Companies": companies,
	}

	_ = web.RenderTemplate(w, "companies.html", data)
}

func (h *CompanyHandler) Create(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	company := &models.Company{
		Name:          r.FormValue("name"),
		TaxNumber:     r.FormValue("taxNumber"),
		TaxOffice:     r.FormValue("taxOffice"),
		ContactPerson: r.FormValue("contactPerson"),
		Email:         r.FormValue("email"),
		Phone:         r.FormValue("phone"),
		YTBSUsername:  r.FormValue("ytbsUsername"),
		YTBSPassword:  r.FormValue("ytbsPassword"),
		YTBSApiKey:    r.FormValue("ytbsApiKey"),
		LicenseNo:     r.FormValue("licenseNo"),
		IsActive:      r.FormValue("isActive") == "true",
	}

	if err := h.companyRepo.Create(r.Context(), company); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/companies", http.StatusSeeOther)
}

func (h *CompanyHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		http.Error(w, "Geçersiz ID", http.StatusBadRequest)
		return
	}

	_ = h.companyRepo.Delete(r.Context(), id)
	http.Redirect(w, r, "/companies", http.StatusSeeOther)
}

func (h *CompanyHandler) TestYTBSConnection(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := r.ParseForm(); err != nil {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Geçersiz form verisi"})
		return
	}

	id, err := uuid.Parse(r.FormValue("id"))
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Geçersiz firma ID"})
		return
	}

	company, err := h.companyRepo.GetByID(r.Context(), id)
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Firma bulunamadı"})
		return
	}

	success, token, err := h.ytbsClient.TestCredentials(r.Context(), company.YTBSApiKey, company.YTBSUsername, company.YTBSPassword)
	if err != nil || !success {
		errMsg := "Bilinmeyen hata"
		if err != nil {
			errMsg = err.Error()
		}
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": errMsg})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"token":   token,
	})
}
