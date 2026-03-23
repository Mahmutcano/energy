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

	// Start Background Worker (Telemetry Persistence)
	telemetryWorker := worker.NewTelemetryWorker()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go telemetryWorker.Start(ctx)

	// Start Alarm Monitor
	alarmSvc := services.GetAlarmService(socketServer)
	alarmSvc.Init()
	go alarmSvc.StartMonitor(ctx)

	// Start SCADA Protocols
	modbusSvc := protocols.GetModbusService(socketServer)
	modbusSvc.Start()

	iec104Svc := protocols.GetIEC104Service(socketServer)
	iec104Svc.Start()

	// Initialize API
	r := gin.New()
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

		// Protected routes
		protected := apiGroup.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/plants", handlers.GetPlants)
			protected.POST("/plants", handlers.CreatePlant)
			protected.PATCH("/plants/:id", handlers.UpdatePlant)
			protected.DELETE("/plants/:id", handlers.DeletePlant)
			protected.GET("/companies", handlers.GetCompanies)
			protected.POST("/companies", handlers.CreateCompany)
			protected.PATCH("/companies/:id", handlers.UpdateCompany)
			protected.DELETE("/companies/:id", handlers.DeleteCompany)
			protected.GET("/users", handlers.GetUsers)
			protected.POST("/users", handlers.CreateUser)
			protected.DELETE("/users/:id", handlers.DeleteUser)
			protected.GET("/devices", handlers.GetDevices)
			protected.POST("/devices", handlers.CreateDevice)
			protected.PATCH("/devices/:id", handlers.UpdateDevice)
			protected.DELETE("/devices/:id", handlers.DeleteDevice)
			protected.GET("/comm-protocols", handlers.GetCommProtocols)
			protected.POST("/comm-protocols", handlers.CreateCommProtocol)
			protected.PATCH("/comm-protocols/:id", handlers.UpdateCommProtocol)
			protected.DELETE("/comm-protocols/:id", handlers.DeleteCommProtocol)

			protected.GET("/datasheet-profiles", handlers.GetDatasheetProfiles)
			protected.POST("/datasheet-profiles", handlers.CreateDatasheetProfile)
			protected.PATCH("/datasheet-profiles/:id", handlers.UpdateDatasheetProfile)
			protected.DELETE("/datasheet-profiles/:id", handlers.DeleteDatasheetProfile)
			protected.GET("/datasheets", handlers.GetDatasheetPoints)
			protected.GET("/datasheets/:profileId", handlers.GetDatasheetPoints)
			protected.POST("/datasheets", handlers.CreateDatasheetPoint)
			protected.POST("/datasheets/bulk", handlers.BulkCreateDatasheetPoints)
			protected.PATCH("/datasheets/:id", handlers.UpdateDatasheetPoint)
			protected.DELETE("/datasheets/:id", handlers.DeleteDatasheetPoint)

			protected.GET("/telemetry/history", handlers.GetTelemetryHistory)
			protected.GET("/telemetry/:deviceId", handlers.GetTelemetry)

			protected.GET("/alarms", handlers.GetAlarms)

			// Admin routes
			admin := protected.Group("/admin")
			{
				admin.POST("/modbus-test", handlers.ModbusTest)
				admin.POST("/iec104-test", handlers.IEC104Test)
				admin.POST("/iec104-gi", handlers.IEC104GI)
			}

			// System routes
			system := protected.Group("/system")
			{
				system.GET("/protocol-statuses", handlers.GetProtocolStatuses)
				system.POST("/flush-telemetry", handlers.FlushTelemetryQueue)
				system.GET("/health-check", handlers.HealthCheck)
				system.GET("/recording-settings", handlers.GetRecordingSettings)
				system.GET("/schema-stats", handlers.GetSchemaStats)
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
