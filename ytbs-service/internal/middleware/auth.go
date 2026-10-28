package middleware

import (
	"context"
	"net/http"
	"strings"
	"ytbs-platform/internal/models"
	"ytbs-platform/internal/repository"
)

type contextKey string

const UserContextKey = contextKey("authUser")

type AuthMiddleware struct {
	userRepo *repository.UserRepository
}

func NewAuthMiddleware(userRepo *repository.UserRepository) *AuthMiddleware {
	return &AuthMiddleware{userRepo: userRepo}
}

func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow static assets
		if strings.HasPrefix(r.URL.Path, "/static/") || r.URL.Path == "/login" {
			next.ServeHTTP(w, r)
			return
		}

		cookie, err := r.Cookie("ytbs_session")
		if err != nil || cookie.Value == "" {
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		user, err := m.userRepo.GetByUsername(r.Context(), cookie.Value)
		if err != nil || user == nil {
			http.SetCookie(w, &http.Cookie{
				Name:   "ytbs_session",
				Value:  "",
				Path:   "/",
				MaxAge: -1,
			})
			http.Redirect(w, r, "/login", http.StatusSeeOther)
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetCurrentUser(r *http.Request) *models.User {
	if val := r.Context().Value(UserContextKey); val != nil {
		if u, ok := val.(*models.User); ok {
			return u
		}
	}
	return nil
}
