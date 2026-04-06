
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, lt, sql, desc, asc } from 'drizzle-orm';
import redisService from './redis.service';
import { io } from '../app';

class SimulationService {
    private static instance: SimulationService;
    private interval: NodeJS.Timeout | null = null;
    private retentionInterval: NodeJS.Timeout | null = null;

    private cachedConfig: any[] = [];
    private lastConfigFetch: number = 0;
    private readonly CONFIG_CACHE_TTL = 30000;

    private sampleIntervalMs: number = 10000;
    private retentionHours: number = 72;
    private maxRecordsTotal: number = 500000;
    private isRecording: boolean = false; // DISABLED BY DEFAULT

    private constructor() { }

    public static getInstance(): SimulationService {
        if (!SimulationService.instance) {
            SimulationService.instance = new SimulationService();
        }
        return SimulationService.instance;
    }

    private async getConfig() {
        const now = Date.now();
        if (now - this.lastConfigFetch < this.CONFIG_CACHE_TTL && this.cachedConfig.length > 0) {
            return this.cachedConfig;
        }

        this.cachedConfig = await db.query.protocolConfig.findMany({
            where: eq(schema.protocolConfig.isActive, true),
            with: {
                devices: {
                    where: eq(schema.device.isActive, true),
                    with: {
                        datasheetProfile: {
                            with: {
                                points: {
                                    where: eq(schema.datasheetPoint.isActive, true)
                                }
                            }
                        }
                    }
                }
            }
        });
        this.lastConfigFetch = now;
        return this.cachedConfig;
    }

    public async start() {
        // FORCE DISABLE IF ENV IS NOT EXPLICITLY TRUE
        if (process.env.ENABLE_SIMULATOR !== 'true') {
            console.log('[SIMULATOR] 🛡️ Simulator safety lock: OFF (No mock data will be generated)');
            this.stop();
            return;
        }
        console.log(`[SIMULATOR] 🚀 Mock data generation ACTIVE.`);

        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(async () => {
            if (!this.isRecording) return;

            try {
                const protocols = await this.getConfig();
                const pushPromises: Promise<void>[] = [];

                for (const proto of protocols) {
                    for (const device of proto.devices) {
                        if (device.datasheetProfile) {
                            for (const point of device.datasheetProfile.points) {
                                const address = point.address;

                                if (address !== null) {
                                    let baseValue = 220;
                                    const value = baseValue + (Math.random() - 0.5) * (baseValue * 0.1);

                                    pushPromises.push(redisService.pushTelemetry({
                                        protocolId: proto.id,
                                        deviceId: device.id,
                                        pointId: point.id,
                                        ioa: address,
                                        value,
                                        unit: point.dataType || 'UNIT',
                                        name: point.dataName,
                                        timestamp: new Date()
                                    }));

                                }
                            }
                        }
                    }
                }

                await Promise.allSettled(pushPromises);
            } catch (err) { }
        }, this.sampleIntervalMs);

        this.startRetentionPolicy();
    }

    private startRetentionPolicy() {
        if (this.retentionInterval) clearInterval(this.retentionInterval);
        this.runRetention();
        this.retentionInterval = setInterval(() => this.runRetention(), 30 * 60 * 1000);
    }

    private async runRetention() {
        try {
            const cutoff = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);
            await db.delete(schema.telemetryValue).where(lt(schema.telemetryValue.measurementTime, cutoff));
        } catch (err) { }
    }

    public getSettings() {
        return {
            sampleIntervalMs: this.sampleIntervalMs,
            retentionHours: this.retentionHours,
            maxRecordsTotal: this.maxRecordsTotal,
            isRecording: this.isRecording
        };
    }

    public updateSettings(settings: any) {
        if (settings.isRecording !== undefined) this.isRecording = settings.isRecording;
        if (this.isRecording && !this.interval) this.start();
        else if (!this.isRecording) this.stop();
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.retentionInterval) {
            clearInterval(this.retentionInterval);
            this.retentionInterval = null;
        }
    }
}

export default SimulationService.getInstance();
