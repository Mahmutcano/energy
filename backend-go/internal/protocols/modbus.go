package protocols

import (
	"context"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"strings"
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
	log.Println("[MODBUS] Master Service Starting...")
	go s.periodicReload()
}

func (s *ModbusService) periodicReload() {
	ticker := time.NewTicker(30 * time.Second) // 30 saniyeye düşürdüm ki değişiklikler hızlı gelsin
	defer ticker.Stop()
	s.ReloadConfigs()
	for range ticker.C {
		s.ReloadConfigs()
	}
}

func (s *ModbusService) ReloadConfigs() {
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

		// GÜNCELLEME: Hash'e noktaların bilgisini de ekliyoruz ki DataType/Multiplier değişince restart atsın
		points := s.fetchPointsForProtocol(protocolID)
		pointsHash := fmt.Sprintf("%v", points) // Noktaların içeriğini string'e çevirip hashliyoruz
		configHash := fmt.Sprintf("%s:%d:%d:%s", ip, port, slaveID, pointsHash)

		s.mu.RLock()
		currentHash, ok := s.activeInstances[protocolID]
		s.mu.RUnlock()

		// Eğer hash değişmişse (DataType, Multiplier veya IP/Port), poller'ı durdur ve yeniden başlat
		if ok && currentHash != configHash {
			log.Printf("[MODBUS] 🔄 Configuration change detected for %s. Restarting poller...", protocolID)
			s.StopProtocol(protocolID)
		}

		if !ok || currentHash != configHash {
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

	s.mu.Lock()
	for pID := range s.activeInstances {
		if !activeInDB[pID] {
			s.mu.Unlock()
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

func (s *ModbusService) GetStatuses() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	res := make(map[string]string)
	for k, v := range s.statuses {
		res[k.String()] = v
	}
	return res
}

func (s *ModbusService) fetchPointsForProtocol(protocolID uuid.UUID) []models.PointToPoll {
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
			continue
		}
		if registerAddress != nil {
			p.Address = *registerAddress
		}
		p.FunctionCode = 3
		if functionCode != nil {
			p.FunctionCode = *functionCode
		}
		p.Multiplier = 1.0
		if multiplier != nil {
			p.Multiplier = *multiplier
		}
		p.DataType = "INT"
		if dataType != nil {
			p.DataType = strings.ToUpper(*dataType)
			// Handle common aliases
			if p.DataType == "FLOAT" {
				p.DataType = "FLOAT32"
			}
			if p.DataType == "DOUBLE" {
				p.DataType = "DOUBLE64"
			}
			if p.DataType == "DINT" || p.DataType == "INT32" {
				p.DataType = "DINT"
			}
			if p.DataType == "UDINT" || p.DataType == "UINT32" || p.DataType == "DWORD" {
				p.DataType = "UDINT"
			}
		}
		if dataValue != nil {
			p.Unit = *dataValue
		}
		points = append(points, p)
	}
	return points
}

func (s *ModbusService) getRegisterCount(dataType string) uint16 {
	switch dataType {
	case "BYTE", "SINT", "USINT", "WORD", "INT", "UINT":
		return 1
	case "DWORD", "DINT", "UDINT", "FLOAT32", "INT32", "UINT32", "FLOAT":
		return 2
	case "LWORD", "LINT", "ULINT", "DOUBLE64", "DOUBLE":
		return 4
	default:
		return 1
	}
}

func (s *ModbusService) setStatus(id uuid.UUID, status string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.statuses[id] != status {
		s.statuses[id] = status
		if s.socket != nil {
			msg := map[string]string{"protocolId": id.String(), "status": status}
			s.socket.Sockets().Emit("protocol:status", msg)
		}
	}
}

func (s *ModbusService) runPollLoop(ctx context.Context, protocolID uuid.UUID, ip string, port, slaveID, timeout int, points []models.PointToPoll) {
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
			return
		case <-ticker.C:
			for _, point := range points {
				count := s.getRegisterCount(point.DataType)
				var results []byte
				var err error

				if point.FunctionCode == 4 {
					results, err = client.ReadInputRegisters(uint16(point.Address), count)
				} else {
					results, err = client.ReadHoldingRegisters(uint16(point.Address), count)
				}

				if err != nil {
					s.setStatus(protocolID, "DISCONNECTED")
					continue
				}

				s.setStatus(protocolID, "CONNECTED")
				if len(results) < int(count*2) {
					continue
				}

				val := s.parseValue(results, point)

				telemetry := models.TelemetryData{
					ProtocolID: protocolID, DeviceID: point.DeviceID, PointID: point.PointID,
					IOA: point.Address, Value: val, Unit: point.Unit,
					Name: point.Name, Timestamp: time.Now(),
				}

				if s.socket != nil {
					s.socket.Sockets().Emit(fmt.Sprintf("telemetry:raw:%s", protocolID), telemetry)
				}
				services.GetAlarmService(s.socket).MarkDeviceSeen(point.DeviceID)
				if point.IsRecording {
					redisSvc.PushTelemetry(telemetry)
				}

				time.Sleep(30 * time.Millisecond)
			}
		}
	}
}

func (s *ModbusService) bytesToUint32(b []byte, swap bool) uint32 {
	if len(b) < 4 {
		return 0
	}
	if swap {
		return uint32(binary.BigEndian.Uint16(b[2:]))<<16 | uint32(binary.BigEndian.Uint16(b[:2]))
	}
	return binary.BigEndian.Uint32(b)
}

func (s *ModbusService) parseValue(b []byte, p models.PointToPoll) float64 {
	// GÜNCELLEME: FLOAT32 veya DOUBLE64 verilerinde multiplier 0.001 seçilse bile 1.0 gibi davranmalı
	// Çünkü bu tipler genellikle zaten ondalıklı veri barındırır.
	if (p.DataType == "FLOAT32" || p.DataType == "DOUBLE64" || p.DataType == "FLOAT" || p.DataType == "DOUBLE") && p.Multiplier == 0.001 {
		p.Multiplier = 1.0
	}

	var finalValue float64

	switch p.DataType {
	case "BYTE", "USINT":
		finalValue = float64(b[1])
	case "SINT":
		finalValue = float64(int8(b[1]))
	case "WORD", "UINT":
		finalValue = float64(binary.BigEndian.Uint16(b))
	case "INT":
		finalValue = float64(int16(binary.BigEndian.Uint16(b)))
	case "FLOAT32":
		bits := s.bytesToUint32(b, p.WordSwap)
		finalValue = float64(math.Float32frombits(bits))
	case "INT32", "DINT":
		bits := s.bytesToUint32(b, p.WordSwap)
		finalValue = float64(int32(bits))
	case "UINT32", "DWORD", "UDINT":
		bits := s.bytesToUint32(b, p.WordSwap)
		finalValue = float64(bits)
	case "DOUBLE64", "DOUBLE":
		if len(b) >= 8 {
			bits := binary.BigEndian.Uint64(b)
			finalValue = math.Float64frombits(bits)
		}
	default:
		finalValue = float64(binary.BigEndian.Uint16(b))
	}

	if math.IsNaN(finalValue) || math.IsInf(finalValue, 0) {
		return 0
	}

	return finalValue * p.Multiplier
}
