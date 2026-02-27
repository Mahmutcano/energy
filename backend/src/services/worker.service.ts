import redisService from './redis.service';
import { saveTelemetryBatch } from '../utils/telemetry';
import { io } from '../app';

class WorkerService {
    private static instance: WorkerService;
    private isRunning: boolean = false;
    private buffer: any[] = [];
    private maxBufferSize: number = 200; // Increased from 100
    private flushInterval: number = 5000; // 5 seconds
    private lastFlush: number = Date.now();

    // Performance metrics
    private processedTotal: number = 0;
    private lastMetricLog: number = Date.now();
    private readonly METRIC_LOG_INTERVAL = 60000; // Log metrics every 60s

    private constructor() { }

    public static getInstance(): WorkerService {
        if (!WorkerService.instance) {
            WorkerService.instance = new WorkerService();
        }
        return WorkerService.instance;
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[WORKER] Telemetry processor started. Mode: SYSTEMATIC BATCHING (v2 - Pipeline)');

        // Start persistence timer
        this.startFlushTimer();

        // Listen to queue in batch mode
        while (this.isRunning) {
            try {
                // Batch pop: grab up to 50 items at once instead of one-by-one
                const telemetryBatch = await redisService.popTelemetryBatch(50);

                if (telemetryBatch.length > 0) {
                    for (const telemetry of telemetryBatch) {
                        this.processItem(telemetry);
                    }
                    this.processedTotal += telemetryBatch.length;

                    // Immediately flush if buffer is full
                    if (this.buffer.length >= this.maxBufferSize) {
                        await this.flushBuffer();
                    }
                }

                // Log performance metrics periodically
                if (Date.now() - this.lastMetricLog >= this.METRIC_LOG_INTERVAL) {
                    console.log(`[WORKER] Metrics: ${this.processedTotal} total processed | Buffer: ${this.buffer.length} | Heap: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
                    this.lastMetricLog = Date.now();
                }
            } catch (err: any) {
                console.error('[WORKER] Error in loop:', err.message);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private startFlushTimer() {
        setInterval(() => {
            if (this.buffer.length > 0 && (Date.now() - this.lastFlush >= this.flushInterval)) {
                this.flushBuffer();
            }
        }, 1000);
    }

    private async flushBuffer() {
        const itemsToSave = this.buffer;
        this.buffer = [];
        this.lastFlush = Date.now();

        if (itemsToSave.length > 0) {
            console.log(`[WORKER] Systematic Flush: Saving ${itemsToSave.length} telemetry points to PostgreSQL...`);

            // Split into chunks of 500 for very large batches to prevent timeout
            const CHUNK_SIZE = 500;
            for (let i = 0; i < itemsToSave.length; i += CHUNK_SIZE) {
                const chunk = itemsToSave.slice(i, i + CHUNK_SIZE);
                await saveTelemetryBatch(chunk);
            }
        }
    }

    // Track last save time per point to throttle DB writes
    private lastSaveMap: Map<string, number> = new Map();
    private readonly DB_SAVE_INTERVAL = 5000; // Save to DB every 5 seconds per point

    /**
     * Process a single item: buffer for DB + broadcast to UI.
     * Separated from async to avoid per-item await overhead.
     */
    private processItem(data: any) {
        const { deviceId, pointId, protocolId, value, timestamp } = data;
        const now = Date.now();

        // 1. Add to systematic persistence buffer (THROTTLED)
        if (deviceId && pointId) {
            const cacheKey = `${deviceId}:${pointId}`;
            const lastSave = this.lastSaveMap.get(cacheKey) || 0;

            if (now - lastSave >= this.DB_SAVE_INTERVAL) {
                this.buffer.push({
                    deviceId,
                    pointId,
                    value,
                    timestamp: timestamp ? new Date(timestamp) : new Date()
                });
                this.lastSaveMap.set(cacheKey, now);

                // Optional: Clean up map occasionally to prevent memory leak
                if (this.lastSaveMap.size > 10000) this.lastSaveMap.clear();
            }
        }

        // 2. Real-time Broadcast (UI is ALWAYS immediate)
        if (deviceId) io.volatile.emit(`telemetry:${deviceId}`, data);
        if (protocolId) io.volatile.emit(`telemetry:${protocolId}`, data);
        io.volatile.emit('telemetry:all', data);

        // 3. Alarm Checks
        if (deviceId) {
            this.checkAlarms(deviceId, value);
        }
    }

    private checkAlarms(deviceId: string, value: number) {
        if (value > 250) {
            const alarm = {
                id: Date.now(),
                deviceId,
                value,
                severity: 'CRITICAL',
                message: `Yüksek Değer Algılandı: ${value}`,
                timestamp: new Date()
            };
            io.volatile.emit(`alarms:${deviceId}`, alarm);
        }
    }

    // Expose metrics for health check
    public getMetrics() {
        return {
            processedTotal: this.processedTotal,
            bufferSize: this.buffer.length,
            isRunning: this.isRunning
        };
    }
}

export default WorkerService.getInstance();
