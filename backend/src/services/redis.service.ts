import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
    private client: Redis | null = null;
    private static instance: RedisService;
    private memoryQueue: any[] = [];
    private useFallback: boolean = false;

    private constructor() {
        try {
            this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    if (times > 1) {
                        this.useFallback = true;
                        console.warn('[REDIS] Falling back to In-Memory Queue');
                        return null; // Stop retrying
                    }
                    return 50;
                }
            });

            this.client.on('error', (err) => {
                // Silently handle connection errors, retry strategy will trigger fallback
            });

            this.client.on('connect', () => {
                console.log('[REDIS] Connected successfully');
                this.useFallback = false;
            });
        } catch (e) {
            this.useFallback = true;
        }
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
