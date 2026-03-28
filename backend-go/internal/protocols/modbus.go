package protocols

import (
	"context"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"energy-scada-platform/internal/db"
	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/redis"
	"energy-scada-platform/internal/services"

	"github.com/goburrow/modbus"
	"github.com/google/uuid"
	"github.com/zishang520/socket.io/v2/socket"
)

type ModbusService struct {
	mu              sync.RWMutex
	activeInstances map[uuid.UUID]string
	cancels         map[uuid.UUID]context.CancelFunc
	socket          *socket.Server
	statuses        map[uuid.UUID]string
}

var modbusInstance *ModbusService
var modbusOnce sync.Once

func GetModbusService(socket *socket.Server) *ModbusService {
	modbusOnce.Do(func() {
		modbusInstance = &ModbusService{
			activeInstances: make(map[uuid.UUID]string),
			cancels:         make(map[uuid.UUID]context.CancelFunc),
			statuses:        make(map[uuid.UUID]string),
			socket:          socket,
		}
	})
	return modbusInstance
}

func (s *ModbusService) Start() {
	log.Println("[MODBUS] Master Service Starting (Go/Goroutines)...")
	go s.periodicReload()
}

func (s *ModbusService) periodicReload() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	// Initial reload
	s.ReloadConfigs()

	for range ticker.C {
		log.Println("[MODBUS] 🕒 Periodic systematic config check...")
		s.ReloadConfigs()
	}
}

func (s *ModbusService) ReloadConfigs() {
	// Query DB for all active Modbus configs
	rows, err := db.Pool.Query(context.Background(), `
		SELECT pc.id, mc."ipAddress", mc.port, mc."slaveId", mc.timeout
		FROM "ProtocolConfig" pc
		JOIN "ModbusConfig" mc ON pc.id = mc."protocolId"
		WHERE pc."protocolType" = 'MODBUS' AND pc."isActive" = true
	`)
	if err != nil {
		log.Printf("[MODBUS] Failed to query configs: %v", err)
		return
	}
	defer rows.Close()

	activeInDB := make(map[uuid.UUID]bool)

	for rows.Next() {
		var protocolID uuid.UUID
		var ip string
		var port, slaveID, timeout int
		if err := rows.Scan(&protocolID, &ip, &port, &slaveID, &timeout); err != nil {
			continue
		}
		activeInDB[protocolID] = true

		configHash := fmt.Sprintf("%s:%d:%d", ip, port, slaveID)

		s.mu.RLock()
		currentHash, ok := s.activeInstances[protocolID]
		s.mu.RUnlock()

		if ok && currentHash != configHash {
			log.Printf("[MODBUS] 🔄 Config changed for Protocol %s. Restarting...", protocolID)
			s.StopProtocol(protocolID)
		}

		if !ok || currentHash != configHash {
			// Get points for this protocol
			points := s.fetchPointsForProtocol(protocolID)
			if len(points) > 0 {
				ctx, cancel := context.WithCancel(context.Background())
				s.mu.Lock()
				s.activeInstances[protocolID] = configHash
				s.cancels[protocolID] = cancel
				s.mu.Unlock()

				go s.runPollLoop(ctx, protocolID, ip, port, slaveID, timeout, points)
			}
		}
	}

	// Stop protocols that are no longer active in DB
	s.mu.Lock()
	for pID := range s.activeInstances {
		if !activeInDB[pID] {
			log.Printf("[MODBUS] 🛑 Stopping non-active Protocol %s", pID)
			s.mu.Unlock() // avoid deadlock
			s.StopProtocol(pID)
			s.mu.Lock()
		}
	}
	s.mu.Unlock()
}

func (s *ModbusService) StopProtocol(id uuid.UUID) {
	s.mu.Lock()
	if cancel, ok := s.cancels[id]; ok {
		cancel()
		delete(s.cancels, id)
		delete(s.activeInstances, id)
		delete(s.statuses, id)
	}
	s.mu.Unlock()
}

func (s *ModbusService) fetchPointsForProtocol(protocolID uuid.UUID) []models.PointToPoll {
	// Simple query: Fetch active points for all devices in this protocol
	rows, err := db.Pool.Query(context.Background(), `
		SELECT dp.address, d.id, dp.id, dp."dataName", NULL as data_value, dp."functionCode", dp.multiplier, dp."wordSwap", dp."dataType", d."isRecording"
		FROM "Device" d
		JOIN "DatasheetPoint" dp ON d."datasheetProfileId" = dp."profileId"
		WHERE d."protocolConfigId" = $1 AND d."isActive" = true AND dp."isActive" = true AND dp.address IS NOT NULL
	`, protocolID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var points []models.PointToPoll
	for rows.Next() {
		var p models.PointToPoll
		var dataType, dataValue *string
		var multiplier *float64
		var registerAddress, functionCode *int
		if err := rows.Scan(&registerAddress, &p.DeviceID, &p.PointID, &p.Name, &dataValue, &functionCode, &multiplier, &p.WordSwap, &dataType, &p.IsRecording); err != nil {
			log.Printf("[MODBUS] Failed to scan point row: %v", err)
			continue
		}
		if registerAddress != nil {
			p.Address = *registerAddress
		}
		if functionCode != nil {
			p.FunctionCode = *functionCode
		} else {
			p.FunctionCode = 3
		}
		if multiplier != nil {
			p.Multiplier = float64(*multiplier)
		} else {
			p.Multiplier = 1.0
		}
		if dataType != nil {
			p.DataType = *dataType
		} else {
			p.DataType = "INT"
		}
		if dataValue != nil {
			p.Unit = *dataValue
		}
		points = append(points, p)
	}
	return points
}

func (s *ModbusService) setStatus(id uuid.UUID, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.statuses[id] != status {
		s.statuses[id] = status
		if s.socket != nil {
			msg := map[string]string{
				"protocolId": id.String(),
				"status":     status,
			}
			s.socket.Sockets().Emit("protocol:status", msg)
		}
	}
}

func (s *ModbusService) GetStatuses() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make(map[string]string)
	for k, v := range s.statuses {
		res[k.String()] = v
	}
	return res
}

func (s *ModbusService) runPollLoop(ctx context.Context, protocolID uuid.UUID, ip string, port, slaveID, timeout int, points []models.PointToPoll) {
	log.Printf("[MODBUS] 🔋 Iniciating Goroutine Poller for Protocol %s (%s:%d)", protocolID, ip, port)

	handler := modbus.NewTCPClientHandler(fmt.Sprintf("%s:%d", ip, port))
	handler.Timeout = time.Duration(timeout) * time.Millisecond
	handler.SlaveId = byte(slaveID)

	client := modbus.NewClient(handler)
	defer handler.Close()

	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()

	redisSvc := redis.GetInstance()

	for {
		select {
		case <-ctx.Done():
			log.Printf("[MODBUS] 🛑 Context cancelled for Poller %s", protocolID)
			return
		case <-ticker.C:
			for _, point := range points {
				count := uint16(1)
				if point.DataType == "FLOAT32" || point.DataType == "INT32" || point.DataType == "UINT32" || point.DataType == "DWORD" {
					count = 2
				}

				var results []byte
				var err error

				if point.FunctionCode == 4 {
					results, err = client.ReadInputRegisters(uint16(point.Address), count)
				} else {
					results, err = client.ReadHoldingRegisters(uint16(point.Address), count)
				}

				if err != nil {
					log.Printf("[MODBUS] Read Error for %s (Addr: %d): %v", protocolID, point.Address, err)
					s.setStatus(protocolID, "DISCONNECTED")
					handler.Close() // Force connection reset to clear corrupt transaction IDs/buffers
					time.Sleep(1 * time.Second)
					continue
				}

				// Small delay to prevent flooding Modbus Gateways with back-to-back requests
				time.Sleep(50 * time.Millisecond)

				s.setStatus(protocolID, "CONNECTED")

				if len(results) < int(count*2) {
					continue
				}

				val := s.parseValue(results, point)
				val = val * point.Multiplier

				telemetry := models.TelemetryData{
					ProtocolID: protocolID,
					DeviceID:   point.DeviceID,
					PointID:    point.PointID,
					IOA:        point.Address,
					Value:      val,
					Unit:       point.Unit,
					Name:       point.Name,
					Timestamp:  time.Now(),
				}

				if s.socket != nil {
					s.socket.Sockets().Emit(fmt.Sprintf("telemetry:raw:%s", protocolID), telemetry)
				}

				// Mark device as seen in AlarmService
				services.GetAlarmService(s.socket).MarkDeviceSeen(point.DeviceID)

				if point.IsRecording {
					redisSvc.PushTelemetry(telemetry)
				}
			}
		}
	}
}

func (s *ModbusService) parseValue(b []byte, p models.PointToPoll) float64 {
	if len(b) == 2 {
		val := binary.BigEndian.Uint16(b)
		if p.DataType == "INT" || p.DataType == "SINT" {
			return float64(int16(val))
		}
		return float64(val)
	} else if len(b) == 4 {
		var val uint32
		if p.WordSwap {
			val = uint32(binary.BigEndian.Uint16(b[2:]))<<16 | uint32(binary.BigEndian.Uint16(b[:2]))
		} else {
			val = binary.BigEndian.Uint32(b)
		}

		switch p.DataType {
		case "FLOAT32":
			bits := val
			return float64(math.Float32frombits(bits))
		case "INT32":
			return float64(int32(val))
		case "UINT32", "DWORD":
			return float64(val)
		default:
			return float64(val)
		}
	}
	return 0
}
