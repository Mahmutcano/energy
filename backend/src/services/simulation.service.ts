import prisma from '../lib/prisma';
import redisService from './redis.service';
import { io } from '../app';

class SimulationService {
    private static instance: SimulationService;
    private interval: NodeJS.Timeout | null = null;

    private constructor() { }

    public static getInstance(): SimulationService {
        if (!SimulationService.instance) {
            SimulationService.instance = new SimulationService();
        }
        return SimulationService.instance;
    }

    public async start() {
        console.log('[SIMULATOR] Starting telemetry simulation...');

        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(async () => {
            try {
                const protocols = await prisma.protocolConfig.findMany({
                    where: { isActive: true },
                    include: {
                        devices: {
                            where: { isActive: true },
                            include: {
                                datasheetProfile: {
                                    include: {
                                        points: { where: { isActive: true } }
                                    }
                                }
                            }
                        }
                    }
                });

                for (const proto of protocols) {
                    for (const device of proto.devices) {
                        if (device.datasheetProfile) {
                            for (const point of device.datasheetProfile.points) {
                                // Sadece adresi olan (mapping yapılmış) noktalar için veri üret
                                const address = proto.protocolType === 'MODBUS'
                                    ? point.registerAddress
                                    : (point.scadaAddress || point.ioa1ObjectAddress);

                                if (address !== null) {
                                    // Gerçekçi dalgalanan değerler üret
                                    let baseValue = 220; // Default Voltage base
                                    if (point.dataName.toLowerCase().includes('power')) baseValue = 500;
                                    if (point.dataName.toLowerCase().includes('current')) baseValue = 15;

                                    const value = baseValue + (Math.random() - 0.5) * (baseValue * 0.1);

                                    await redisService.pushTelemetry({
                                        protocolId: proto.id,
                                        deviceId: device.id,
                                        pointId: point.id,
                                        ioa: address,
                                        value: value,
                                        unit: point.dataType || 'UNIT',
                                        name: point.dataName,
                                        timestamp: new Date()
                                    });
                                }
                            }
                        }
                    }

                    // IEC104 ise raw data emisyonu yap (Diagnostic panel için)
                    if (proto.protocolType === 'IEC104') {
                        const rawPoints = proto.devices.flatMap(d =>
                            (d.datasheetProfile?.points || [])
                                .filter(p => p.scadaAddress !== null)
                                .map(p => ({
                                    ioa: p.scadaAddress,
                                    typeId: 36, // M_ME_TF_1 (Measured value, short floating point)
                                    value: 200 + Math.random() * 50,
                                    qds: 0,
                                    timestamp: new Date(),
                                    description: p.signalDescription || p.dataName,
                                    unit: p.dataType
                                }))
                        );
                        if (rawPoints.length > 0) {
                            io.emit(`telemetry:raw:${proto.id}`, rawPoints);
                        }
                    }
                }
            } catch (err) {
                console.error('[SIMULATOR] Error generating mock data:', err);
            }
        }, 3000); // 3 saniyede bir veri üret
    }

    public stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export default SimulationService.getInstance();
