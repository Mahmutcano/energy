import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
    private client: Redis | null = null;
    private static instance: RedisService;
    private memoryQueue: any[] = [];
    private useFallback: boolean = false;

    private constructor() {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null, // Critical for long-running processes
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 5000);
                if (times === 1) {
                    console.warn('[REDIS] Connection lost. Falling back to In-Memory Queue...');
                    this.useFallback = true;
                }
                return delay;
            },
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            }
        });

        this.client.on('error', (err) => {
            console.error('[REDIS] Error:', err.message);
            this.useFallback = true;
        });

        this.client.on('connect', () => {
            console.log('[REDIS] Connecting...');
        });

        this.client.on('ready', () => {
            console.log('[REDIS] Connected and Ready. Switching from Memory to Redis.');
            this.useFallback = false;
        });

        this.client.on('reconnecting', () => {
            console.log('[REDIS] Reconnecting...');
        });
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    public async pushTelemetry(data: any) {
        if (this.useFallback || !this.client) {
            this.memoryQueue.push(data);
            return;
        }
        try {
            await this.client.lpush('telemetry_queue', JSON.stringify(data));
        } catch (err) {
            this.memoryQueue.push(data);
        }
    }

    public async popTelemetry(): Promise<any> {
        if (this.useFallback || !this.client) {
            while (this.memoryQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.memoryQueue.shift();
        }
        try {
            const data = await this.client.brpop('telemetry_queue', 0);
            if (data) return JSON.parse(data[1]);
        } catch (err) {
            if (this.memoryQueue.length > 0) return this.memoryQueue.shift();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }
}

export default RedisService.getInstance();
