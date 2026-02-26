import redisService from './redis.service';
import { saveTelemetryBatch } from '../utils/telemetry';
import { io } from '../app';

class WorkerService {
    private static instance: WorkerService;
    private isRunning: boolean = false;
    private buffer: any[] = [];
    private maxBufferSize: number = 100;
    private flushInterval: number = 5000; // 5 seconds
    private lastFlush: number = Date.now();

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
        console.log('[WORKER] Telemetry processor started. Mode: SYSTEMATIC BATCHING');

        // Start persistence timer
        this.startFlushTimer();

        // Listen to queue in infinite loop
        while (this.isRunning) {
            try {
                const telemetry = await redisService.popTelemetry();
                if (telemetry) {
                    this.process(telemetry);
                }
            } catch (err) {
                console.error('[WORKER] Error processing items:', err);
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
        const itemsToSave = [...this.buffer];
        this.buffer = [];
        this.lastFlush = Date.now();

        if (itemsToSave.length > 0) {
            console.log(`[WORKER] Systematic Flush: Saving ${itemsToSave.length} telemetry points to PostgreSQL...`);
            await saveTelemetryBatch(itemsToSave);
        }
    }

    private async process(data: any) {
        const { deviceId, pointId, protocolId, value, timestamp } = data;

        // 1. Add to systematic persistence buffer
        if (deviceId && pointId) {
            this.buffer.push({
                deviceId,
                pointId,
                value,
                timestamp: timestamp ? new Date(timestamp) : new Date()
            });

            // 2. Immediate flush if buffer is full
            if (this.buffer.length >= this.maxBufferSize) {
                this.flushBuffer();
            }
        }

        // 3. Real-time Broadcast (UI is always immediate)
        if (deviceId) io.emit(`telemetry:${deviceId}`, data);
        if (protocolId) io.emit(`telemetry:${protocolId}`, data);
        io.emit('telemetry:all', data);

        // 4. Alarm Checks
        if (deviceId) {
            this.checkAlarms(deviceId, value);
        }
    }

    private checkAlarms(deviceId: string, value: number) {
        // Örnek basit alarm mantığı
        if (value > 250) { // Örn: Yüksek Voltaj
            const alarm = {
                id: Date.now(),
                deviceId,
                value,
                severity: 'CRITICAL',
                message: `Yüksek Değer Algılandı: ${value}`,
                timestamp: new Date()
            };
            io.emit(`alarms:${deviceId}`, alarm);
        }
    }
}

export default WorkerService.getInstance();
