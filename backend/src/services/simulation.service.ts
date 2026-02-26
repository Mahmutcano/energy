import prisma from '../lib/prisma';
import redisService from './redis.service';
import { io } from '../app';

class SimulationService {
    private static instance: SimulationService;
    private interval: NodeJS.Timeout | null = null;

    // Cache protocol/device config to avoid DB query every tick
    private cachedConfig: any[] = [];
    private lastConfigFetch: number = 0;
    private readonly CONFIG_CACHE_TTL = 30000; // Refresh config every 30s

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
        console.log('[SIMULATOR] Starting telemetry simulation (v2 - Cached Config)...');

        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(async () => {
            try {
                const protocols = await this.getConfig();

                // Collect all telemetry pushes, then batch them
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

                    // IEC104 raw data emission
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

                // Execute all pushes concurrently
                await Promise.allSettled(pushPromises);
            } catch (err) {
                console.error('[SIMULATOR] Error generating mock data:', err);
            }
        }, 3000);
    }

    public invalidateCache() {
        this.lastConfigFetch = 0;
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export default SimulationService.getInstance();
