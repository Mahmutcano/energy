package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"

	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/redis"
	redis_v9 "github.com/redis/go-redis/v9"
	"github.com/zishang520/socket.io/v2/socket"
)

type TelemetryBroadcaster struct {
	socketServer *socket.Server
	redisSvc     *redis.RedisService
}

var (
	broadcasterInstance *TelemetryBroadcaster
	broadcasterOnce     sync.Once
)

func GetTelemetryBroadcaster(socketServer *socket.Server) *TelemetryBroadcaster {
	broadcasterOnce.Do(func() {
		broadcasterInstance = &TelemetryBroadcaster{
			socketServer: socketServer,
			redisSvc:     redis.GetInstance(),
		}
	})
	return broadcasterInstance
}

func (b *TelemetryBroadcaster) Start(ctx context.Context) {
	log.Println("[BROADCASTER] Real-time Telemetry Service Starting (Hybrid Mode: Redis + Local Channel)...")

	// 1. Subscribe to Redis
	var redisCh <-chan *redis_v9.Message
	if b.redisSvc.IsActive() {
		pubsub := redis.Client.PSubscribe(ctx, "telemetry:*")
		defer pubsub.Close()
		redisCh = pubsub.Channel()
	}

	// 2. Get Internal Local Channel
	internalCh := b.redisSvc.GetInternalChannel()

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-redisCh: // From Redis
			if !ok {
				redisCh = nil // Redis channel closed
				continue
			}
			b.handlePayload(msg.Payload)
		case msg, ok := <-internalCh: // From Local Go Channel
			if !ok {
				continue
			}
			b.handlePayload(msg.Payload)
		}
	}
}

func (b *TelemetryBroadcaster) handlePayload(payload string) {
	var telemetry models.TelemetryData
	if err := json.Unmarshal([]byte(payload), &telemetry); err != nil {
		log.Printf("[BROADCASTER] ❌ Unmarshal error: %v | Payload: %s", err, payload)
		return
	}

	if b.socketServer != nil {
		// Room: protocol:PROTOCOL_ID (Normalize to lowercase just in case)
		pID := strings.ToLower(telemetry.ProtocolID.String())
		roomName := fmt.Sprintf("protocol:%s", pID)
		
		// Debug Log
		log.Printf("[BROADCASTER] 📡 Emitting to room %s | Point: %s | Val: %v", roomName, telemetry.Name, telemetry.Value)

		// Emit to protocol-specific room
		b.socketServer.Sockets().To(socket.Room(roomName)).Emit("telemetry:update", telemetry)

		// Admin Raw feed
		b.socketServer.Sockets().To(socket.Room("admin:telemetry")).Emit("telemetry:raw", telemetry)
	}
}
