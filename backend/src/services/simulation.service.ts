
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, lt, sql, desc, asc } from 'drizzle-orm';
import redisService from './redis.service';
import { io } from '../app';

class SimulationService {
    private static instance: SimulationService;
    private interval: NodeJS.Timeout | null = null;
    private retentionInterval: NodeJS.Timeout | null = null;

    // Cache protocol/device config to avoid DB query every tick
    private cachedConfig: any[] = [];
    private lastConfigFetch: number = 0;
    private readonly CONFIG_CACHE_TTL = 30000;

    // Configurable settings
    private sampleIntervalMs: number = 10000;
    private retentionHours: number = 72;
    private maxRecordsTotal: number = 500000;
    private isRecording: boolean = true;

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
        console.log(`[SIMULATOR] Starting telemetry simulation | Interval: ${this.sampleIntervalMs / 1000}s | Retention: ${this.retentionHours}h | Max Records: ${this.maxRecordsTotal.toLocaleString()}`);

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
                                const address = proto.protocolType === 'MODBUS'
                                    ? point.registerAddress
                                    : (point.scadaAddress || point.ioa1ObjectAddress);

                                if (address !== null) {
                                    let baseValue = 220;
                                    if (point.dataName.toLowerCase().includes('power')) baseValue = 500;
                                    if (point.dataName.toLowerCase().includes('current')) baseValue = 15;

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

                    if (proto.protocolType === 'IEC104') {
                        const rawPoints = proto.devices.flatMap((d: any) =>
                            (d.datasheetProfile?.points || [])
                                .filter((p: any) => p.scadaAddress !== null)
                                .map((p: any) => ({
                                    ioa: p.scadaAddress,
                                    typeId: 36,
                                    value: 200 + Math.random() * 50,
                                    qds: 0,
                                    timestamp: new Date(),
                                    description: p.signalDescription || p.dataName,
                                    unit: p.dataType
                                }))
                        );
                        if (rawPoints.length > 0) {
                            io.volatile.emit(`telemetry:raw:${proto.id}`, rawPoints);
                        }
                    }
                }

                await Promise.allSettled(pushPromises);
            } catch (err) {
                console.error('[SIMULATOR] Error generating mock data:', err);
            }
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
            const deleteResult = await db.delete(schema.telemetryValue).where(lt(schema.telemetryValue.measurementTime, cutoff));

            if (deleteResult.rowCount && deleteResult.rowCount > 0) {
                console.log(`[RETENTION] Cleaned ${deleteResult.rowCount} records older than ${this.retentionHours}h`);
            }

            const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.telemetryValue);
            const totalCount = Number(countResult[0]?.count || 0);

            if (totalCount > this.maxRecordsTotal) {
                const excess = totalCount - this.maxRecordsTotal;
                const oldestToKeep = await db.query.telemetryValue.findFirst({
                    orderBy: [asc(schema.telemetryValue.measurementTime)],
                    offset: excess,
                    columns: { measurementTime: true }
                });
                if (oldestToKeep) {
                    const deleteLimitResult = await db.delete(schema.telemetryValue).where(lt(schema.telemetryValue.measurementTime, oldestToKeep.measurementTime));
                    console.log(`[RETENTION] Hard limit cleanup: removed ${deleteLimitResult.rowCount ?? 0} excess records (total was ${totalCount}, max: ${this.maxRecordsTotal})`);
                }
            }
        } catch (err) {
            console.error('[RETENTION] Error during cleanup:', err);
        }
    }

    public getSettings() {
        return {
            sampleIntervalMs: this.sampleIntervalMs,
            sampleIntervalSec: this.sampleIntervalMs / 1000,
            retentionHours: this.retentionHours,
            maxRecordsTotal: this.maxRecordsTotal,
            isRecording: this.isRecording
        };
    }

    public updateSettings(settings: {
        sampleIntervalSec?: number;
        retentionHours?: number;
        maxRecordsTotal?: number;
        isRecording?: boolean;
    }) {
        if (settings.sampleIntervalSec !== undefined) {
            this.sampleIntervalMs = Math.max(5, settings.sampleIntervalSec) * 1000;
            if (this.interval) {
                clearInterval(this.interval);
                this.start();
            }
            console.log(`[SIMULATOR] Sample interval updated to ${this.sampleIntervalMs / 1000}s`);
        }
        if (settings.retentionHours !== undefined) {
            this.retentionHours = Math.max(1, settings.retentionHours);
            console.log(`[SIMULATOR] Retention updated to ${this.retentionHours}h`);
        }
        if (settings.maxRecordsTotal !== undefined) {
            this.maxRecordsTotal = Math.max(10000, settings.maxRecordsTotal);
            console.log(`[SIMULATOR] Max records updated to ${this.maxRecordsTotal.toLocaleString()}`);
        }
        if (settings.isRecording !== undefined) {
            this.isRecording = settings.isRecording;
            console.log(`[SIMULATOR] Recording ${this.isRecording ? 'RESUMED' : 'PAUSED'}`);
        }
    }

    public invalidateCache() {
        this.lastConfigFetch = 0;
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
