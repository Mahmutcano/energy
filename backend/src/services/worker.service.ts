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
    private maxBufferSize: number = 10;
    private flushInterval: number = 500; // 0.5 seconds
    private lastFlush: number = Date.now();

    // Performance metrics
    private processedTotal: number = 0;

    // Retry / Resiliency
    private consecutiveFlushFailures: number = 0;
    private readonly MAX_BUFFER_LIMIT = 50000; // Prevent OOM: drop oldest if buffer grows too large

    // Watchdog
    private lastSeenAtMap: Map<string, number> = new Map();
    private readonly COMM_WATCHDOG_INTERVAL = 30000; // 30s check
    private readonly COMM_TIMEOUT_THRESHOLD = 120000; // 2 minutes
    private pointIntervals: Map<string, number> = new Map();

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

        // Load point intervals
        await this.reloadPointIntervals();

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

        // Main processing loop with auto-restart
        this.runMainLoop();
    }

    private async runMainLoop() {
        console.log('[WORKER] Main processing loop started.');
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

        // If loop exits unexpectedly, auto-restart after delay
        if (this.isRunning) {
            console.error('[WORKER] ⚠️ Main loop exited unexpectedly! Restarting in 3 seconds...');
            setTimeout(() => this.runMainLoop(), 3000);
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
            const failedItems: any[] = [];

            for (let i = 0; i < itemsToSave.length; i += CHUNK_SIZE) {
                const chunk = itemsToSave.slice(i, i + CHUNK_SIZE);
                try {
                    await saveTelemetryBatch(chunk);
                } catch (err: any) {
                    console.error(`[WORKER] ❌ Chunk save failed (${chunk.length} items):`, err.message);
                    failedItems.push(...chunk);
                }
            }

            // Re-queue failed items back into buffer for retry
            if (failedItems.length > 0) {
                this.consecutiveFlushFailures++;
                console.warn(`[WORKER] ⚠️ Re-queuing ${failedItems.length} failed items. Consecutive failures: ${this.consecutiveFlushFailures}`);
                this.buffer = [...failedItems, ...this.buffer];

                // Prevent OOM: if buffer is too large, drop oldest data
                if (this.buffer.length > this.MAX_BUFFER_LIMIT) {
                    const dropped = this.buffer.length - this.MAX_BUFFER_LIMIT;
                    this.buffer = this.buffer.slice(dropped);
                    console.error(`[WORKER] 🚨 Buffer overflow! Dropped ${dropped} oldest items to prevent OOM.`);
                }

                // Exponential backoff: wait longer on consecutive failures (max 30s)
                const backoffMs = Math.min(1000 * Math.pow(2, this.consecutiveFlushFailures), 30000);
                console.warn(`[WORKER] Backing off for ${backoffMs}ms before next flush...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            } else {
                // Reset failure counter on success
                if (this.consecutiveFlushFailures > 0) {
                    console.log(`[WORKER] ✅ Flush recovered after ${this.consecutiveFlushFailures} failures.`);
                    this.consecutiveFlushFailures = 0;
                }
            }
        }
    }

    private lastSaveMap: Map<string, number> = new Map();
    private lastValueMap: Map<string, number> = new Map();

    public async reloadPointIntervals() {
        try {
            const points = await db.query.datasheetPoint.findMany();
            this.pointIntervals.clear();
            points.forEach(p => {
                // Store in seconds, default to 60 if null
                this.pointIntervals.set(p.id, p.recordingInterval ?? 60);
            });
            console.log(`[WORKER] Loaded recording intervals for ${points.length} points.`);
        } catch (err) {
            console.error('[WORKER] Error loading point intervals:', err);
        }
    }

    /**
     * Process a single item: buffer for DB + broadcast to UI.
     * THIS IS FULLY SYNCHRONOUS - no await, no DB calls, no blocking.
     */
    private processItem(data: any) {
        const { deviceId, pointId, protocolId, value, ioa, timestamp } = data;
        console.log(`[WORKER] ProcessItem: dev=${deviceId?.substring(0,8)} point=${pointId?.substring(0,8)} ioa=${ioa} val=${value}`);
        const now = Date.now();

        // 0. Update Last Seen for Watchdog (SYNC - just a Map.set)
        if (deviceId) {
            this.lastSeenAtMap.set(deviceId, now);
            // Non-blocking alarm resolution via fire-and-forget with error handling
            alarmService.markDeviceSeen(deviceId);
        }

        // 1. Add to persistence buffer (THROTTLED & DEAD BANDED)
        if (deviceId && pointId) {
            const cacheKey = `${deviceId}:${pointId}`;
            const lastSave = this.lastSaveMap.get(cacheKey) || 0;
            const lastValue = this.lastValueMap.get(cacheKey);

            // Get per-point interval (default to 60s if not found)
            const intervalSeconds = this.pointIntervals.get(pointId) ?? 60;
            
            // 0 means SAVE EVERYTHING (No throttling)
            const isAlwaysSave = intervalSeconds === 0;

            // Throttling: Only save if interval elapsed OR it's a special point (isAlwaysSave)
            const timePassed = isAlwaysSave || (now - lastSave >= intervalSeconds * 1000);
            
            // Deadbanding (Optional: could be per-point too, but keeping it simple for now)
            // If it's always save, we don't care about value change either (save every packet)
            const valueChanged = isAlwaysSave || lastValue === undefined || Math.abs(value - lastValue) > 0;
            
            // Heartbeat: Force save every 60s even if no change (only if not always saving)
            const heartbeat = !isAlwaysSave && (now - lastSave > 60000); 

            if (timePassed && (valueChanged || heartbeat)) {
                this.buffer.push({
                    deviceId,
                    pointId,
                    value,
                    timestamp: timestamp ? new Date(timestamp) : new Date()
                });
                this.lastSaveMap.set(cacheKey, now);
                this.lastValueMap.set(cacheKey, value);

                if (this.lastSaveMap.size > 10000) {
                    this.lastSaveMap.clear();
                    this.lastValueMap.clear();
                }
            }
        }

        // 2. Real-time Broadcast (Immediate for UI)
        io.emit(`telemetry:${deviceId}`, data);
        if (protocolId) io.emit(`telemetry:${protocolId}`, data);
        io.emit('telemetry:all', data);
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
