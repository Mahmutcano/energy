import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

class RedisService {
    private client: Redis | null = null;
    private static instance: RedisService;
    private memoryQueue: any[] = [];
    private useFallback: boolean = false;
    private readonly QUEUE_KEY = 'telemetry_queue';

    // Pipeline batch buffer for high-throughput writes
    private pushBuffer: string[] = [];
    private pushFlushTimer: NodeJS.Timeout | null = null;
    private readonly PUSH_BATCH_SIZE = 1;
    private readonly PUSH_FLUSH_INTERVAL = 50; // ms

    private constructor() {
        this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                const delay = Math.min(times * 100, 5000);
                if (times === 1) {
                    console.warn('[REDIS] Connection lost. Falling back to In-Memory Queue...');
                    this.useFallback = true;
                }
                return delay;
            },
            reconnectOnError: (err) => {
                if (err.message.includes('READONLY')) return true;
                return false;
            },
            // Performance tuning
            enableReadyCheck: true,
            lazyConnect: false,
            keepAlive: 30000,
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

        // Start pipeline flush timer
        this.pushFlushTimer = setInterval(() => {
            this.flushPushBuffer();
        }, this.PUSH_FLUSH_INTERVAL);
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    /**
     * Uses Redis pipeline for batched writes instead of individual lpush calls.
     * This reduces network round trips significantly under load.
     */
    public async pushTelemetry(data: any) {
        if (this.useFallback || !this.client) {
            this.memoryQueue.push(data);
            return;
        }
        try {
            this.pushBuffer.push(JSON.stringify(data));
            if (this.pushBuffer.length >= this.PUSH_BATCH_SIZE) {
                await this.flushPushBuffer();
            }
        } catch (err) {
            this.memoryQueue.push(data);
        }
    }

    private async flushPushBuffer() {
        if (this.pushBuffer.length === 0 || this.useFallback || !this.client) return;

        const items = this.pushBuffer.splice(0);
        try {
            const pipeline = this.client.pipeline();
            for (const item of items) {
                pipeline.lpush(this.QUEUE_KEY, item);
            }
            await pipeline.exec();
        } catch (err) {
            // Fallback: push to memory queue
            for (const item of items) {
                try { this.memoryQueue.push(JSON.parse(item)); } catch { }
            }
        }
    }

    /**
     * Batch pop: Retrieves multiple items at once using lrange + ltrim
     * instead of blocking on a single item. Falls back to brpop for idle state.
     */
    public async popTelemetryBatch(batchSize: number = 50): Promise<any[]> {
        if (this.useFallback || !this.client) {
            if (this.memoryQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
                return [];
            }
            return this.memoryQueue.splice(0, batchSize);
        }

        try {
            // Atomic batch: get items then trim
            const items = await this.client.lrange(this.QUEUE_KEY, -batchSize, -1);
            if (items.length > 0) {
                await this.client.ltrim(this.QUEUE_KEY, 0, -(items.length + 1));
                return items.map(item => JSON.parse(item));
            }

            // Fallback to blocking pop if queue was empty
            const result = await this.client.brpop(this.QUEUE_KEY, 2);
            if (result && result[1]) {
                return [JSON.parse(result[1])];
            }
        } catch (err: any) {
            console.error('[REDIS] BatchPop Error:', err.message);
            if (this.memoryQueue.length > 0) return this.memoryQueue.splice(0, batchSize);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return [];
    }

    // Keep legacy single pop for compatibility
    public async popTelemetry(): Promise<any> {
        if (this.useFallback || !this.client) {
            while (this.memoryQueue.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.memoryQueue.shift();
        }
        try {
            const result = await this.client.brpop(this.QUEUE_KEY, 5);
            if (result && result[1]) {
                return JSON.parse(result[1]);
            }
        } catch (err: any) {
            console.error('[REDIS] Pop Error:', err.message);
            if (this.memoryQueue.length > 0) return this.memoryQueue.shift();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    }

    public getStatus(): { connected: boolean; mode: string } {
        return {
            connected: !this.useFallback && this.client !== null,
            mode: this.useFallback ? 'IN_MEMORY_FALLBACK' : 'REDIS'
        };
    }

    public async getQueueLength(): Promise<number> {
        if (this.useFallback || !this.client) {
            return this.memoryQueue.length;
        }
        try {
            return await this.client.llen(this.QUEUE_KEY);
        } catch {
            return this.memoryQueue.length;
        }
    }

    public async flushTelemetryQueue() {
        if (!this.useFallback && this.client) {
            await this.client.del(this.QUEUE_KEY);
            console.log('[REDIS] Telemetry queue flushed.');
        } else {
            this.memoryQueue = [];
            console.log('[REDIS] Memory queue flushed.');
        }
    }
}

export default RedisService.getInstance();
