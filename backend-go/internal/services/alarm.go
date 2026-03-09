package services

import (
	"context"
	"log"
	"sync"
	"time"

	"energy-scada-platform/internal/db"

	"github.com/google/uuid"
	"github.com/zishang520/socket.io/v2/socket"
)

type AlarmService struct {
	mu                       sync.RWMutex
	activeCommAlarmDeviceIDs map[uuid.UUID]bool
	lastSeenTimes            map[uuid.UUID]time.Time
	socket                   *socket.Server
	initialized              bool
}

var (
	alarmInstance *AlarmService
	alarmOnce     sync.Once
)

func GetAlarmService(socket *socket.Server) *AlarmService {
	alarmOnce.Do(func() {
		alarmInstance = &AlarmService{
			activeCommAlarmDeviceIDs: make(map[uuid.UUID]bool),
			lastSeenTimes:            make(map[uuid.UUID]time.Time),
			socket:                   socket,
		}
	})
	return alarmInstance
}

func (s *AlarmService) Init() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.initialized {
		return
	}

	// Load existing active alarms from DB
	rows, err := db.Pool.Query(context.Background(), `
		SELECT device_id FROM "CommunicationAlarm" WHERE status = 'ACTIVE'
	`)
	if err != nil {
		log.Printf("[ALARM] Failed to initialize existing alarms: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var deviceID uuid.UUID
			if err := rows.Scan(&deviceID); err == nil {
				s.activeCommAlarmDeviceIDs[deviceID] = true
			}
		}
	}

	s.initialized = true
	log.Printf("[ALARM] Service initialized with %d active alarms.", len(s.activeCommAlarmDeviceIDs))
}

func (s *AlarmService) MarkDeviceSeen(deviceID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastSeenTimes[deviceID] = time.Now()

	// If there was an active comm alarm, resolve it
	if s.activeCommAlarmDeviceIDs[deviceID] {
		go s.ResolveCommAlarm(deviceID)
	}
}

func (s *AlarmService) StartMonitor(ctx context.Context) {
	log.Println("[ALARM] Background Communication Monitor Started")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.checkTimeouts()
		}
	}
}

func (s *AlarmService) checkTimeouts() {
	s.mu.RLock()
	now := time.Now()
	timeout := 120 * time.Second // 2 minutes data gap = communication alarm

	var devicesToAlarm []uuid.UUID
	for deviceID, lastSeen := range s.lastSeenTimes {
		if !s.activeCommAlarmDeviceIDs[deviceID] && now.Sub(lastSeen) > timeout {
			devicesToAlarm = append(devicesToAlarm, deviceID)
		}
	}
	s.mu.RUnlock()

	for _, dID := range devicesToAlarm {
		go s.CreateCommAlarm(dID)
	}
}

func (s *AlarmService) CreateCommAlarm(deviceID uuid.UUID) {
	s.mu.Lock()
	if s.activeCommAlarmDeviceIDs[deviceID] {
		s.mu.Unlock()
		return
	}
	s.activeCommAlarmDeviceIDs[deviceID] = true
	lastSeenAt := s.lastSeenTimes[deviceID]
	s.mu.Unlock()

	_, err := db.Pool.Exec(context.Background(), `
		INSERT INTO "CommunicationAlarm" (id, device_id, message, status, "startTime", "lastSeenAt")
		VALUES ($1, $2, 'Veri akışı kesildi / Data stream interrupted', 'ACTIVE', $3, $4)
	`, uuid.New(), deviceID, time.Now(), lastSeenAt)

	if err != nil {
		log.Printf("[ALARM] Failed to DB record alarm: %v", err)
	}

	if s.socket != nil {
		eventData := map[string]interface{}{
			"deviceId":   deviceID,
			"status":     "ACTIVE",
			"startTime":  time.Now(),
			"lastSeenAt": lastSeenAt,
			"message":    "Veri akışı kesildi / Data stream interrupted",
		}
		s.socket.Sockets().Emit("alarm:comm:new", eventData)
	}

	log.Printf("[ALARM] ⚠️ Communication lost for device: %s", deviceID)
}

func (s *AlarmService) ResolveCommAlarm(deviceID uuid.UUID) {
	s.mu.Lock()
	if !s.activeCommAlarmDeviceIDs[deviceID] {
		s.mu.Unlock()
		return
	}
	delete(s.activeCommAlarmDeviceIDs, deviceID)
	s.mu.Unlock()

	_, err := db.Pool.Exec(context.Background(), `
		UPDATE "CommunicationAlarm" SET status = 'RESOLVED', "endTime" = $1
		WHERE device_id = $2 AND status = 'ACTIVE'
	`, time.Now(), deviceID)

	if err != nil {
		log.Printf("[ALARM] Failed to DB resolve alarm: %v", err)
	}

	if s.socket != nil {
		eventData := map[string]interface{}{
			"deviceId": deviceID,
			"status":   "RESOLVED",
			"endTime":  time.Now(),
		}
		s.socket.Sockets().Emit("alarm:comm:resolved", eventData)
	}

	log.Printf("[ALARM] ✅ Communication restored for device: %s", deviceID)
}
