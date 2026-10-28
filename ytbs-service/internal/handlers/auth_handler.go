package handlers

import (
	"net/http"
	"time"
	"ytbs-platform/internal/repository"
	"ytbs-platform/web"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
}

func NewAuthHandler(userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

func (h *AuthHandler) ShowLogin(w http.ResponseWriter, r *http.Request) {
	// If already authenticated, redirect to dashboard
	if cookie, err := r.Cookie("ytbs_session"); err == nil && cookie.Value != "" {
		http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
		return
	}

	_ = web.RenderStandalone(w, "login.html", map[string]interface{}{
		"Title": "Giriş Yap",
		"Error": r.URL.Query().Get("error"),
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/login?error=Geçersiz+form+verisi", http.StatusSeeOther)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	user, err := h.userRepo.GetByUsername(r.Context(), username)
	if err != nil || user == nil {
		http.Redirect(w, r, "/login?error=Kullanıcı+adı+veya+şifre+hatalı", http.StatusSeeOther)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		http.Redirect(w, r, "/login?error=Kullanıcı+adı+veya+şifre+hatalı", http.StatusSeeOther)
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "ytbs_session",
		Value:    user.Username,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "ytbs_session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
