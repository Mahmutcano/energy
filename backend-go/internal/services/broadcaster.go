package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"energy-scada-platform/internal/models"
	"energy-scada-platform/internal/redis"
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
	log.Println("[BROADCASTER] Real-time Telemetry Service Starting (Redis Bridge Mode)...")

	// Redis client üzerinden abonelik (subscription) başlat
	// '*' wildcard kullanımı ile tüm telemetry kanallarını dinle
	pubsub := redis.Client.PSubscribe(ctx, "telemetry:*")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-ch:
			var telemetry models.TelemetryData
			if err := json.Unmarshal([]byte(msg.Payload), &telemetry); err != nil {
				continue
			}

			// KRİPTO BORSASI STRATEJİSİ: Veriyi sarsıntısız dağıt
			// Sadece bu cihazın verisini bekleyen kullanıcılara (Room basis) gönder
			if b.socketServer != nil {
				// Room: protocol:PROTOCOL_ID
				roomName := fmt.Sprintf("protocol:%s", telemetry.ProtocolID.String())
				b.socketServer.Sockets().To(socket.Room(roomName)).Emit("telemetry:update", telemetry)
				
				// Genel kanal (Sistem adminleri için)
				b.socketServer.Sockets().To(socket.Room("admin:telemetry")).Emit("telemetry:raw", telemetry)
			}
		}
	}
}
