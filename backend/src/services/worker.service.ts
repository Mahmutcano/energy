import redisService from './redis.service';
import { saveTelemetryBatch } from '../utils/telemetry';
import { io } from '../app';
import alarmService from './alarm.service';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

class WorkerService {
    private static instance: WorkerService;
    private isRunning: boolean = false;
    private buffer: any[] = [];
    private maxBufferSize: number = 200;
    private flushInterval: number = 5000; // 5 seconds
    private lastFlush: number = Date.now();

    // Performance metrics
    private processedTotal: number = 0;

    // Watchdog
    private lastSeenAtMap: Map<string, number> = new Map();
    private readonly COMM_WATCHDOG_INTERVAL = 30000; // 30s check
    private readonly COMM_TIMEOUT_THRESHOLD = 120000; // 2 minutes

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
        console.log('[WORKER] Telemetry processor starting...');

        // Initialize alarm service once at startup
        await alarmService.init();

        // Initialize lastSeenAtMap with ALL active devices
        try {
            const devices = await db.query.device.findMany({
                where: eq(schema.device.isActive, true)
            });
            const now = Date.now();
            devices.forEach((d: any) => {
                this.lastSeenAtMap.set(d.id, now);
            });
            console.log(`[WORKER] Watchdog initialized for ${devices.length} devices.`);
        } catch (err) {
            console.error('[WORKER] Watchdog init error:', err);
        }

        // Start persistence timer
        this.startFlushTimer();

        // Start communication watchdog
        this.startCommWatchdog();

        // Metrics logging
        setInterval(() => {
            if (this.processedTotal > 0) {
                console.log(`[WORKER] Metrics: ${this.processedTotal} points processed, Buffer: ${this.buffer.length}`);
                this.processedTotal = 0;
            }
        }, 60000);

        // Main processing loop
        while (this.isRunning) {
            try {
                const telemetryBatch = await redisService.popTelemetryBatch(50);
                if (telemetryBatch.length > 0) {
                    for (const telemetry of telemetryBatch) {
                        this.processItem(telemetry);
                    }
                    this.processedTotal += telemetryBatch.length;

                    if (this.buffer.length >= this.maxBufferSize) {
                        await this.flushBuffer();
                    }
                }
            } catch (err: any) {
                console.error('[WORKER] Error in processing loop:', err.message);
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
            console.log(`[WORKER] Flushing ${itemsToSave.length} telemetry points to DB...`);

            const CHUNK_SIZE = 500;
            for (let i = 0; i < itemsToSave.length; i += CHUNK_SIZE) {
                const chunk = itemsToSave.slice(i, i + CHUNK_SIZE);
                await saveTelemetryBatch(chunk);
            }
        }
    }

    // Track last save time per point to throttle DB writes
    private lastSaveMap: Map<string, number> = new Map();
    private readonly DB_SAVE_INTERVAL = 200; // 5 points per second per point

    /**
     * Process a single item: buffer for DB + broadcast to UI.
     * THIS IS FULLY SYNCHRONOUS - no await, no DB calls, no blocking.
     */
    private processItem(data: any) {
        const { deviceId, pointId, protocolId, value, timestamp } = data;
        const now = Date.now();

        // 0. Update Last Seen for Watchdog (SYNC - just a Map.set)
        if (deviceId) {
            this.lastSeenAtMap.set(deviceId, now);
            // Non-blocking alarm resolution via fire-and-forget with error handling
            alarmService.markDeviceSeen(deviceId);
        }

        // 1. Add to persistence buffer (THROTTLED)
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

                if (this.lastSaveMap.size > 10000) this.lastSaveMap.clear();
            }
        }

        // 2. Real-time Broadcast (always immediate, volatile = drop if slow)
        if (deviceId) io.volatile.emit(`telemetry:${deviceId}`, data);
        if (protocolId) io.volatile.emit(`telemetry:${protocolId}`, data);
        io.volatile.emit('telemetry:all', data);
    }

    // Expose metrics for health check
    public getMetrics() {
        return {
            processedTotal: this.processedTotal,
            bufferSize: this.buffer.length,
            isRunning: this.isRunning
        };
    }

    private startCommWatchdog() {
        setInterval(() => {
            this.checkCommTimeouts();
        }, this.COMM_WATCHDOG_INTERVAL);
    }

    private async checkCommTimeouts() {
        const now = Date.now();
        for (const [deviceId, lastSeen] of this.lastSeenAtMap.entries()) {
            const elapsed = now - lastSeen;
            if (elapsed > this.COMM_TIMEOUT_THRESHOLD) {
                console.warn(`[WORKER] Timeout: Device ${deviceId} - no data for ${Math.round(elapsed / 1000)}s`);
                await alarmService.triggerCommAlarm(deviceId, new Date(lastSeen));
                io.emit(`device:status:${deviceId}`, { status: 'OFFLINE', lastSeenAt: new Date(lastSeen) });
            }
        }
    }
}

export default WorkerService.getInstance();
