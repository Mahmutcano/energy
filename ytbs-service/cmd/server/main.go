package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ytbs-platform/internal/config"
	"ytbs-platform/internal/db"
	"ytbs-platform/internal/handlers"
	"ytbs-platform/internal/middleware"
	"ytbs-platform/internal/repository"
	"ytbs-platform/internal/services"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	log.Println("==================================================")
	log.Println("⚡ YTBS Energy SCADA Platform başlatılıyor...")
	log.Println("==================================================")

	// 1. Load Config
	cfg := config.Load()
	log.Printf("[CONFIG] Port: %s | DB: %s", cfg.Port, cfg.DatabaseURL)
	log.Printf("[CONFIG] Alert Email: %s", cfg.AlertEmail)

	// 2. Connect Database & Run Migrations
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[FATAL] Veritabanı bağlantı hatası: %v", err)
	}
	defer database.Close()

	// 3. Initialize Repositories
	companyRepo := repository.NewCompanyRepository(database)
	plantRepo := repository.NewPlantRepository(database)
	userRepo := repository.NewUserRepository(database)
	dataDefRepo := repository.NewDataDefRepository(database)
	logRepo := repository.NewLogRepository(database)

	// 4. Initialize Services & Source Telemetry DB (Railway / SCADA)
	var sourceDB *sql.DB
	if cfg.SourceDBURL != "" {
		sdb, err := sql.Open("pgx", cfg.SourceDBURL)
		if err == nil {
			sdb.SetMaxOpenConns(5)
			sdb.SetConnMaxLifetime(5 * time.Minute)
			pingCtx, pCancel := context.WithTimeout(context.Background(), 4*time.Second)
			defer pCancel()
			if pErr := sdb.PingContext(pingCtx); pErr == nil {
				sourceDB = sdb
				log.Println("[DB-SOURCE] SCADA/Railway kaynak telemetri veritabanına bağlanıldı")
			} else {
				log.Printf("[DB-SOURCE-WARN] SCADA kaynak DB'ye ilk bağlantı sağlanamadı: %v (Worker otomatik deneyecek)", pErr)
				sourceDB = sdb
			}
		}
	}

	ytbsClient := services.NewYTBSClient()
	mailer := services.NewMailer(cfg)
	worker := services.NewTransmissionWorker(database, sourceDB, plantRepo, companyRepo, logRepo, dataDefRepo, ytbsClient, mailer)

	// 5. Start Background Scheduler Worker
	if cfg.WorkerEnabled {
		workerCtx, workerCancel := context.WithCancel(context.Background())
		defer workerCancel()
		worker.Start(workerCtx)
	}

	// 6. Initialize Handlers & Auth Middleware
	authMiddleware := middleware.NewAuthMiddleware(userRepo)

	authHandler := handlers.NewAuthHandler(userRepo)
	dashboardHandler := handlers.NewDashboardHandler(logRepo, worker)
	companyHandler := handlers.NewCompanyHandler(companyRepo, ytbsClient)
	plantHandler := handlers.NewPlantHandler(plantRepo, companyRepo)
	userHandler := handlers.NewUserHandler(userRepo, companyRepo)
	dataDefHandler := handlers.NewDataDefHandler(dataDefRepo, plantRepo)
	transHandler := handlers.NewTransmissionHandler(logRepo, plantRepo, worker)

	// 7. Chi HTTP Router
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// Public Routes
	r.Get("/login", authHandler.ShowLogin)
	r.Post("/login", authHandler.Login)
	r.Get("/logout", authHandler.Logout)

	// Protected Routes (Requires Session Cookie)
	r.Group(func(protected chi.Router) {
		protected.Use(authMiddleware.RequireAuth)

		// Dashboard
		protected.Get("/", dashboardHandler.ShowDashboard)
		protected.Get("/dashboard", dashboardHandler.ShowDashboard)

		// Plants (Santral Tanımlama / Santrallerim)
		protected.Get("/plants", plantHandler.List)
		protected.Post("/plants", plantHandler.Create)
		protected.Post("/plants/update", plantHandler.Update)
		protected.Post("/plants/delete", plantHandler.Delete)
		protected.Post("/plants/toggle-ytbs", plantHandler.ToggleYTBS)

		// Transmissions & Reports (Gönderim & Rapor Ekranı)
		protected.Get("/transmissions", transHandler.List)
		protected.Post("/transmissions/update", transHandler.UpdateValue)
		protected.Post("/transmissions/delete", transHandler.Delete)
		protected.Post("/transmissions/retry", transHandler.Retry)
		protected.Post("/transmissions/trigger-now", transHandler.TriggerNow)

		// System Admin Only Routes
		protected.Group(func(adminRouter chi.Router) {
			adminRouter.Use(func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					u := middleware.GetCurrentUser(r)
					if u == nil || u.Role != "system_admin" {
						http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
						return
					}
					next.ServeHTTP(w, r)
				})
			})

			// Companies (Firma Tanımlama)
			adminRouter.Get("/companies", companyHandler.List)
			adminRouter.Post("/companies", companyHandler.Create)
			adminRouter.Post("/companies/update", companyHandler.Update)
			adminRouter.Post("/companies/delete", companyHandler.Delete)
			adminRouter.Post("/companies/test-ytbs", companyHandler.TestYTBSConnection)

			// Users (Kullanıcı Tanımlama & Firma Eşleştirme)
			adminRouter.Get("/users", userHandler.List)
			adminRouter.Post("/users", userHandler.Create)
			adminRouter.Post("/users/update", userHandler.Update)
			adminRouter.Post("/users/delete", userHandler.Delete)

			// Data Definitions (Veri & Tag Tanımlama)
			adminRouter.Get("/data-definitions", dataDefHandler.List)
			adminRouter.Post("/data-definitions", dataDefHandler.Create)
			adminRouter.Post("/data-definitions/delete", dataDefHandler.Delete)
		})
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 8. Graceful Shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[HTTP] Sunucu http://localhost:%s adresinde dinleniyor...", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] Sunucu hatası: %v", err)
		}
	}()

	<-stop
	log.Println("[SHUTDOWN] Sunucu kapatılıyor...")

	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()

	if err := server.Shutdown(ctxShutdown); err != nil {
		log.Fatalf("[FATAL] Zorunlu kapatma hatası: %v", err)
	}

	fmt.Println("Güle güle!")
}
