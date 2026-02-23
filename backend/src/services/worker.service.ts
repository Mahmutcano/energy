import redisService from './redis.service';
import { saveTelemetry } from '../utils/telemetry';
import { io } from '../app';

class WorkerService {
    private static instance: WorkerService;
    private isRunning: boolean = false;

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
        console.log('[WORKER] Telemetry processor started. Waiting for data...');

        // Sonsuz döngüde kuyruğu dinle
        while (this.isRunning) {
            try {
                const telemetry = await redisService.popTelemetry();
                if (telemetry) {
                    this.process(telemetry);
                }
            } catch (err) {
                console.error('[WORKER] Error processing items:', err);
                // Hata durumunda kısa bir bekleme (sunucuyu yormamak için)
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private async process(data: any) {
        const { deviceId, pointId, value, unit, name, timestamp } = data;

        // 1. Veritabanına Yaz (Historian)
        if (deviceId && pointId) {
            saveTelemetry(deviceId, pointId, value);
        }

        // 2. Canlı Yayını Yap (Real-time UI)
        io.emit(`telemetry:${deviceId}`, data);

        // 3. Alarm Kontrollerini Yap (Business Logic)
        if (deviceId) {
            this.checkAlarms(deviceId, value);
        }

        console.log(`[WORKER] Processed: ${deviceId} | VAL: ${value} ${unit || ''}`);
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
