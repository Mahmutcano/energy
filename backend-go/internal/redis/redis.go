package redis

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	Client   *redis.Client
	ctx      = context.Background()
	instance *RedisService
	once     sync.Once
)

type InternalMessage struct {
	Channel string
	Payload string
}

type RedisService struct {
	client          *redis.Client
	useFallback     bool
	mu              sync.RWMutex
	memoryQueue     []interface{}
	InternalChannel chan InternalMessage
}

func GetInstance() *RedisService {
	once.Do(func() {
		redisURL := os.Getenv("REDIS_URL")
		if redisURL == "" {
			redisURL = "redis://localhost:6379"
		}

		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Fatalf("[REDIS] Failed to parse URL: %v", err)
		}

		// Performance tuning
		opt.PoolSize = 100
		opt.MinIdleConns = 10
		opt.MaxIdleConns = 50
		opt.DialTimeout = 5 * time.Second
		opt.ReadTimeout = 3 * time.Second
		opt.WriteTimeout = 3 * time.Second

		client := redis.NewClient(opt)

		// Test connection
		if err := client.Ping(ctx).Err(); err != nil {
			log.Printf("[REDIS] Connection failed, starting in fallback mode: %v", err)
			instance = &RedisService{
				client:          client,
				useFallback:     true,
				InternalChannel: make(chan InternalMessage, 1000), // Buffer for safety
			}
		} else {
			log.Println("[REDIS] Connected to Redis successfully")
			instance = &RedisService{
				client:          client,
				useFallback:     false,
				InternalChannel: make(chan InternalMessage, 1000),
			}
		}
		Client = client
	})
	return instance
}

func (s *RedisService) PushTelemetry(data interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.useFallback {
		s.memoryQueue = append(s.memoryQueue, data)
		return nil
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	err = s.client.LPush(ctx, "telemetry_queue", jsonData).Err()
	if err != nil {
		log.Printf("[REDIS] LPUSH Error: %v. Falling back to memory.", err)
		s.memoryQueue = append(s.memoryQueue, data)
		// Try to ping to see if we should stay in fallback
		if errPing := s.client.Ping(ctx).Err(); errPing != nil {
			s.useFallback = true
		}
		return err
	}
	return nil
}

func (s *RedisService) GetQueueLength() (int64, error) {
	if s.useFallback {
		return int64(len(s.memoryQueue)), nil
	}
	return s.client.LLen(ctx, "telemetry_queue").Result()
}

func (s *RedisService) IsActive() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return !s.useFallback
}

func (s *RedisService) PublishTelemetry(channel string, data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Always publish to internal channel for local fallback support
	select {
	case s.InternalChannel <- InternalMessage{Channel: channel, Payload: string(jsonData)}:
	default:
		// Channel full, drop message
	}

	if s.useFallback || s.client == nil {
		return nil
	}

	return s.client.Publish(ctx, channel, jsonData).Err()
}

func (s *RedisService) GetInternalChannel() chan InternalMessage {
	return s.InternalChannel
}

func (s *RedisService) FlushTelemetryQueue() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.memoryQueue = nil
	if !s.useFallback {
		return s.client.Del(ctx, "telemetry_queue").Err()
	}
	return nil
}
