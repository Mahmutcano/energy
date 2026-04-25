package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"energy-scada-platform/internal/api"
	"energy-scada-platform/internal/api/handlers"
	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/middleware"
	"energy-scada-platform/internal/protocols"
	"energy-scada-platform/internal/redis"
	"energy-scada-platform/internal/services"
	"energy-scada-platform/internal/worker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"strings"
	"net/http"
)

func main() {
	// Load environment
	_ = godotenv.Load(".env")

	// Connect to Database
	if err := db.Connect(); err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	// Initialize Redis
	_ = redis.GetInstance()

	// Initialize Socket.io
	socketServer := api.InitSocket()

	// Start Background Workers
	telemetryWorker := worker.NewTelemetryWorker()
	ytbsAggregator := worker.NewYtbsAggregator()
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	go telemetryWorker.Start(ctx)
	go ytbsAggregator.Start(ctx)

	// Start Alarm Monitor
	alarmSvc := services.GetAlarmService(socketServer)
	alarmSvc.Init()
	go alarmSvc.StartMonitor(ctx)

	// Start SCADA Protocols (The Fetchers)
	modbusSvc := protocols.GetModbusService(socketServer)
	modbusSvc.Start()

	iec104Svc := protocols.GetIEC104Service(socketServer)
	iec104Svc.Start()

	// Start Telemetry Broadcaster (The Bridge/Broadcaster)
	broadcasterSvc := services.GetTelemetryBroadcaster(socketServer)
	go broadcasterSvc.Start(ctx)

	// Initialize API
	// Start YTBS Background Worker
	services.GetYtbsService().StartWorker()

	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS Setup
	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Requested-With", "Upgrade", "Connection", "Sec-WebSocket-Key", "Sec-WebSocket-Accept", "Sec-WebSocket-Version", "Sec-WebSocket-Protocol", "Sec-WebSocket-Extensions"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Socket.io Route
	r.Any("/socket.io/*any", gin.WrapH(socketServer.ServeHandler(nil)))

	// REST API Routes
	apiGroup := r.Group("/api")
	{
		apiGroup.POST("/auth/login", handlers.Login)
		apiGroup.POST("/auth/register", handlers.Register)

		// Protected routes
		protected := apiGroup.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Public/Protected GET routes for all authenticated users
			protected.GET("/plants", handlers.GetPlants)
			protected.GET("/devices", handlers.GetDevices)
			protected.GET("/datasheets", handlers.GetDatasheetPoints)
			protected.GET("/datasheets/:profileId", handlers.GetDatasheetPoints)
			protected.GET("/telemetry/history", handlers.GetTelemetryHistory)
			protected.GET("/telemetry/:deviceId", handlers.GetTelemetry)
			protected.GET("/alarms", handlers.GetAlarms)

			// Management routes (ADMIN ONLY)
			mgmt := protected.Group("/")
			mgmt.Use(middleware.RoleMiddleware("SUPER_ADMIN", "COMPANY_ADMIN"))
			{
				mgmt.POST("/plants", handlers.CreatePlant)
				mgmt.PATCH("/plants/:id", handlers.UpdatePlant)
				mgmt.DELETE("/plants/:id", handlers.DeletePlant)
				mgmt.GET("/companies", handlers.GetCompanies)
				mgmt.POST("/companies", handlers.CreateCompany)
				mgmt.PATCH("/companies/:id", handlers.UpdateCompany)
				mgmt.DELETE("/companies/:id", handlers.DeleteCompany)
				mgmt.GET("/users", handlers.GetUsers)
				mgmt.POST("/users", handlers.CreateUser)
				mgmt.PATCH("/users/:id", handlers.UpdateUser)
				mgmt.DELETE("/users/:id", handlers.DeleteUser)
				mgmt.POST("/devices", handlers.CreateDevice)
				mgmt.PATCH("/devices/:id", handlers.UpdateDevice)
				mgmt.DELETE("/devices/:id", handlers.DeleteDevice)
				mgmt.GET("/comm-protocols", handlers.GetCommProtocols)
				mgmt.POST("/comm-protocols", handlers.CreateCommProtocol)
				mgmt.PATCH("/comm-protocols/:id", handlers.UpdateCommProtocol)
				mgmt.DELETE("/comm-protocols/:id", handlers.DeleteCommProtocol)

				mgmt.GET("/datasheet-profiles", handlers.GetDatasheetProfiles)
				mgmt.POST("/datasheet-profiles", handlers.CreateDatasheetProfile)
				mgmt.PATCH("/datasheet-profiles/:id", handlers.UpdateDatasheetProfile)
				mgmt.DELETE("/datasheet-profiles/:id", handlers.DeleteDatasheetProfile)
				mgmt.POST("/datasheets", handlers.CreateDatasheetPoint)
				mgmt.POST("/datasheets/bulk", handlers.BulkCreateDatasheetPoints)
				mgmt.PATCH("/datasheets/:id", handlers.UpdateDatasheetPoint)
				mgmt.DELETE("/datasheets/:id", handlers.DeleteDatasheetPoint)

				// Admin-specific operations
				admin := mgmt.Group("/admin")
				{
					admin.POST("/modbus-test", handlers.ModbusTest)
					admin.POST("/iec104-test", handlers.IEC104Test)
					admin.POST("/iec104-gi", handlers.IEC104GI)
				}
			}

			// System routes (ADMIN ONLY)
			system := mgmt.Group("/system")
			{
				system.GET("/protocol-statuses", handlers.GetProtocolStatuses)
				system.POST("/flush-telemetry", handlers.FlushTelemetryQueue)
				system.GET("/health-check", handlers.HealthCheck)
				system.GET("/recording-settings", handlers.GetRecordingSettings)
				system.PATCH("/recording-settings", handlers.UpdateRecordingSettings)
				system.POST("/run-retention", handlers.RunRetention)
				system.GET("/schema-stats", handlers.GetSchemaStats)
			}

			// YTBS routes (ADMIN ONLY)
			ytbs := mgmt.Group("/ytbs")
			{
				ytbs.GET("/imported-ids", handlers.GetImportedIds)
				ytbs.GET("/logs", handlers.GetProductionLogs)
				ytbs.DELETE("/logs/:type/:id", handlers.DeleteProductionLog)
				ytbs.POST("/test-log", handlers.CreateTestLog)
				ytbs.POST("/query-external", handlers.QueryExternalPlants)
				ytbs.POST("/query-external-logs", handlers.QueryExternalLogs)
				ytbs.POST("/import-external", handlers.ImportExternalPlants)
				ytbs.POST("/remove-external", handlers.RemoveExternalPlant)
			}
		}
	}

	// Serve Static Files (Frontend)
	// We serve the 'public' directory which will contain the Next.js export
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Skip if it's an API or Socket.io route (should have been handled above)
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/socket.io") {
			return
		}

		// Try to serve static file from the public directory
		// If path is root or file doesn't exist, Gin will handle it
		filesystem := http.Dir("./public")
		file, err := filesystem.Open(path)
		if err == nil {
			file.Close()
			c.File("./public" + path)
			return
		}

		// Fallback to index.html for SPA routing
		c.File("./public/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	go func() {
		log.Printf("[SERVER] Go Backend running on port %s", port)
		if err := r.Run(":" + port); err != nil {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Listen for stop signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	<-stop
	log.Println("[SERVER] Shutting down gracefully...")
}
