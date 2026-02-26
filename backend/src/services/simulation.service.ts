import prisma from '../lib/prisma';
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
    private sampleIntervalMs: number = 10000; // Default: 10 seconds (was 3s)
    private retentionHours: number = 72;       // Keep last 72 hours of data
    private maxRecordsTotal: number = 500000;  // Hard limit: 500K records
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

        this.cachedConfig = await prisma.protocolConfig.findMany({
            where: { isActive: true },
            include: {
                devices: {
                    where: { isActive: true },
                    include: {
                        datasheetProfile: {
                            include: {
                                points: {
                                    where: { isActive: true },
                                    select: {
                                        id: true,
                                        dataName: true,
                                        registerAddress: true,
                                        scadaAddress: true,
                                        ioa1ObjectAddress: true,
                                        dataType: true,
                                        signalDescription: true
                                    }
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

        // Data generation loop
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

        // Data retention cleanup - runs every 30 minutes
        this.startRetentionPolicy();
    }

    /**
     * Periodic data retention: 
     * 1) Delete records older than retentionHours
     * 2) If total records > maxRecordsTotal, delete oldest excess
     */
    private startRetentionPolicy() {
        if (this.retentionInterval) clearInterval(this.retentionInterval);

        // Run immediately once, then every 30 min
        this.runRetention();
        this.retentionInterval = setInterval(() => this.runRetention(), 30 * 60 * 1000);
    }

    private async runRetention() {
        try {
            // 1. Time-based cleanup
            const cutoff = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);
            const deletedByAge = await prisma.telemetryValue.deleteMany({
                where: { measurementTime: { lt: cutoff } }
            });
            if (deletedByAge.count > 0) {
                console.log(`[RETENTION] Cleaned ${deletedByAge.count} records older than ${this.retentionHours}h`);
            }

            // 2. Hard limit cleanup
            const totalCount = await prisma.telemetryValue.count();
            if (totalCount > this.maxRecordsTotal) {
                const excess = totalCount - this.maxRecordsTotal;
                // Delete the oldest excess records
                const oldestToKeep = await prisma.telemetryValue.findFirst({
                    orderBy: { measurementTime: 'asc' },
                    skip: excess,
                    select: { measurementTime: true }
                });
                if (oldestToKeep) {
                    const deletedByLimit = await prisma.telemetryValue.deleteMany({
                        where: { measurementTime: { lt: oldestToKeep.measurementTime } }
                    });
                    console.log(`[RETENTION] Hard limit cleanup: removed ${deletedByLimit.count} excess records (total was ${totalCount}, max: ${this.maxRecordsTotal})`);
                }
            }
        } catch (err) {
            console.error('[RETENTION] Error during cleanup:', err);
        }
    }

    // ---- Control API ----

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
            this.sampleIntervalMs = Math.max(5, settings.sampleIntervalSec) * 1000; // Min 5s
            // Restart with new interval
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
