package protocols

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/redis"

	"github.com/google/uuid"
	"github.com/zishang520/socket.io/v2/socket"
)

type IEC104Service struct {
	mu              sync.RWMutex
	activeInstances map[uuid.UUID]string
	socket          *socket.Server
}

var iec104Instance *IEC104Service
var iec104Once sync.Once

func GetIEC104Service(socket *socket.Server) *IEC104Service {
	iec104Once.Do(func() {
		iec104Instance = &IEC104Service{
			activeInstances: make(map[uuid.UUID]string),
			socket:          socket,
		}
	})
	return iec104Instance
}

func (s *IEC104Service) Start() {
	log.Println("[IEC104] Master Service Starting (Go/Skeleton)...")
	go s.periodicReload()
}

func (s *IEC104Service) periodicReload() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	s.ReloadConfigs()

	for range ticker.C {
		s.ReloadConfigs()
	}
}

func (s *IEC104Service) ReloadConfigs() {
	rows, err := db.Pool.Query(context.Background(), `
		SELECT pc.id, ic."ipAddress", ic.port, ic."asduAddr"
		FROM "ProtocolConfig" pc
		JOIN "IEC104Config" ic ON pc.id = ic."protocolId"
		WHERE pc."protocolType" = 'IEC104' AND pc."isActive" = true
	`)
	if err != nil {
		log.Printf("[IEC104] Failed to reload config: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		var ip string
		var port, asdu int
		if err := rows.Scan(&id, &ip, &port, &asdu); err != nil {
			log.Printf("[IEC104] Failed to scan row: %v", err)
			continue
		}

		s.mu.RLock()
		_, active := s.activeInstances[id]
		s.mu.RUnlock()

		if !active {
			log.Printf("[IEC104] Found config for %s:%d (ASDU: %d). Starting SIMULATION poller.", ip, port, asdu)
			s.mu.Lock()
			s.activeInstances[id] = "SIMULATING"
			s.mu.Unlock()
			go s.simulateTelemetry(id)
		}
	}
}

func (s *IEC104Service) simulateTelemetry(protocolID uuid.UUID) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Get points
	rows, err := db.Pool.Query(context.Background(), `
		SELECT d.id, dp.id, dp."dataName", NULL as data_value, dp.address, d."isRecording"
		FROM "Device" d
		JOIN "DatasheetPoint" dp ON d."datasheetProfileId" = dp."profileId"
		WHERE d."protocolConfigId" = $1 AND d."isActive" = true AND dp."isActive" = true AND dp.address IS NOT NULL
	`, protocolID)

	if err != nil {
		return
	}
	defer rows.Close()

	type SimPoint struct {
		DeviceID    uuid.UUID
		PointID     uuid.UUID
		Name        string
		Unit        string
		Address     int
		IsRecording bool
	}

	var points []SimPoint
	for rows.Next() {
		var p SimPoint
		var dataValue *string
		if err := rows.Scan(&p.DeviceID, &p.PointID, &p.Name, &dataValue, &p.Address, &p.IsRecording); err != nil {
			continue
		}
		if dataValue != nil {
			p.Unit = *dataValue
		}
		points = append(points, p)
	}

	redisSvc := redis.GetInstance()

	for range ticker.C {
		// Broadcast protocol status
		if s.socket != nil {
			s.socket.Sockets().Emit("protocol:status", map[string]string{
				"protocolId": protocolID.String(),
				"status":     "CONNECTED",
			})
		}

		for _, p := range points {
			var val float64
			namo := time.Now().UnixNano()
			if namo < 0 {
				namo = -namo
			}

			nameLower := strings.ToLower(p.Name)

			if strings.Contains(nameLower, "kw") || strings.Contains(nameLower, "p ") || strings.Contains(nameLower, "kva") {
				val = float64(1200 + (namo%2000)/100.0) // ~1200-1220 kW
			} else if strings.Contains(nameLower, "kv") || strings.Contains(nameLower, "v ") || strings.Contains(nameLower, "vac") || strings.Contains(nameLower, "vab") {
				val = float64(220 + (namo%200-100)/10.0) // ~210-230 V/KV
			} else if strings.Contains(nameLower, "(a)") || strings.Contains(nameLower, " i") || strings.HasPrefix(nameLower, "i") {
				val = float64(50 + (namo%100)/10.0) // ~50-60 A
			} else if strings.Contains(nameLower, "frekans") || strings.Contains(nameLower, "hz") {
				val = 50.0 + (float64(namo%20-10) / 100.0) // ~49.9 - 50.1 Hz
			} else if strings.Contains(nameLower, "cos") || strings.Contains(nameLower, "pf") {
				val = 0.95 + (float64(namo%5) / 100.0) // ~0.95 - 0.99
			} else if strings.Contains(nameLower, "enerj") {
				val = 150000.0 + float64(namo%1000)
			} else if strings.Contains(nameLower, "thd") {
				val = float64(namo%100) / 10.0 // 0-10 for THD%
			} else {
				// Fallback to random value around 220
				val = float64(220 + (namo%20 - 10))
			}

			telemetry := models.TelemetryData{
				ProtocolID: protocolID,
				DeviceID:   p.DeviceID,
				PointID:    p.PointID,
				IOA:        p.Address,
				Value:      val,
				Unit:       p.Unit,
				Name:       p.Name,
				Timestamp:  time.Now(),
			}

			// KRİPTO BORSASI STRATEJİSİ: Doğrudan Socket.io yerine Redis Pub/Sub kullanıyoruz
			// Not: redisSvc.PublishTelemetry artık hem Redis'e hem de yerel kanala basıyor.
			redisSvc.PublishTelemetry(fmt.Sprintf("telemetry:%s", protocolID), telemetry)

			// Push to redis so the worker persists it to TimescaleDB
			if p.IsRecording {
				redisSvc.PushTelemetry(telemetry)
			}
		}
	}
}

func (s *IEC104Service) GetStatuses() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	res := make(map[string]string)
	for id := range s.activeInstances {
		res[id.String()] = "CONNECTED" // Simulate Connected status
	}
	return res
}
