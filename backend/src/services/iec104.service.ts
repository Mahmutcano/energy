import { Protocol } from 'iec104-protocol';
import redisService from './redis.service';
import prisma from '../lib/prisma';
import { io } from '../app';

interface IOAMapEntry {
    pointId: string;
    deviceId: string;
    dataName: string;
    description: string;
    unit: string;
}

export class IEC104Service {
    private static instance: IEC104Service;
    private connections: Map<string, any> = new Map();
    private ioaMaps: Map<string, Map<number, IOAMapEntry>> = new Map();

    private constructor() { }

    public static getInstance(): IEC104Service {
        if (!IEC104Service.instance) {
            IEC104Service.instance = new IEC104Service();
        }
        return IEC104Service.instance;
    }

    public async start() {
        console.log('[IEC104] Master Service Started. Fetching configs from DB...');
        await this.reloadConfigs();
    }

    public async reloadConfigs() {
        console.log('[IEC104] Reloading IOA Maps from DB...');
        try {
            const protocols = await prisma.protocolConfig.findMany({
                where: {
                    protocolType: 'IEC104',
                    isActive: true
                },
                include: {
                    iec104Config: true,
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

            for (const protocol of protocols) {
                if (!protocol.iec104Config) continue;

                const ioaMap = new Map<number, IOAMapEntry>();
                for (const device of protocol.devices) {
                    if (device.datasheetProfile) {
                        for (const point of device.datasheetProfile.points) {
                            const entry: IOAMapEntry = {
                                pointId: point.id,
                                deviceId: device.id,
                                dataName: point.dataName,
                                description: point.signalDescription || point.dataName || 'Unknown',
                                unit: point.dataType || point.dataValue || 'UNIT'
                            };

                            // Multi-address matching strategy:
                            // We attempt to map both Scada Address and IOA1. 
                            // Hardware IOA can match either of these fields in the datasheet.
                            if (point.scadaAddress !== null && point.scadaAddress !== undefined) {
                                ioaMap.set(Number(point.scadaAddress), entry);
                            }
                            if (point.ioa1ObjectAddress !== null && point.ioa1ObjectAddress !== undefined) {
                                ioaMap.set(Number(point.ioa1ObjectAddress), entry);
                            }
                        }
                    }
                }

                // Update the map (this is picked up immediately by existing connections)
                this.ioaMaps.set(protocol.id, ioaMap);
                console.log(`[IEC104] Updated map for Protocol ${protocol.id} with ${ioaMap.size} points.`);

                // If no connection exists yet, create it
                if (!this.connections.has(protocol.id)) {
                    const config = protocol.iec104Config;
                    this.connectToProtocol(
                        protocol.id,
                        config.ipAddress,
                        config.port,
                        config.asduAddr,
                        { t1: config.t1, t2: config.t2, t3: config.t3 }
                    );
                }
            }
        } catch (error) {
            console.error('[IEC104] Failed to reload configs:', error);
        }
    }

    public connectToProtocol(protocolId: string, ip: string, port: number, asduAddress: number, timers: { t1: number, t2: number, t3: number }) {
        console.log(`[IEC104] Connecting to hardware at ${ip}:${port} | ASDU: ${asduAddress} for Protocol ${protocolId}`);

        try {
            const conn = new Protocol(ip, port, (data: any[]) => {
                const ioaMap = this.ioaMaps.get(protocolId) || new Map<number, IOAMapEntry>();

                // broadcast raw data for diagnostics
                const rawPoints = data.map(item => {
                    const entry = ioaMap.get(item.IOA);
                    return {
                        ioa: item.IOA,
                        typeId: item.typeId,
                        value: item.MeasuredValueShort ??
                            item.MeasuredValueNormalizedWithoutQuality ??
                            item.MeasuredValueScaled ??
                            item.val ?? 0,
                        qds: item.qds,
                        timestamp: new Date(),
                        description: entry?.description,
                        name: entry?.dataName,
                        unit: entry?.unit,
                        deviceId: entry?.deviceId
                    };
                });

                io.emit(`telemetry:raw:${protocolId}`, rawPoints);

                data.forEach(item => {
                    const value = item.MeasuredValueShort ??
                        item.MeasuredValueNormalizedWithoutQuality ??
                        item.MeasuredValueScaled ??
                        item.val ?? 0;

                    const ioaEntry = ioaMap.get(item.IOA);
                    if (ioaEntry) {
                        const payload = {
                            protocolId: protocolId,
                            deviceId: ioaEntry.deviceId,
                            pointId: ioaEntry.pointId,
                            ioa: item.IOA,
                            value: value,
                            unit: ioaEntry.unit,
                            name: ioaEntry.description,
                            timestamp: new Date()
                        };
                        redisService.pushTelemetry(payload);
                    }
                });
            }, { autoReconnect: true, quiet: true });

            if ((conn as any).connection) {
                (conn as any).connection.t1 = timers.t1 * 1000;
                (conn as any).connection.t2 = timers.t2 * 1000;
                (conn as any).connection.t3 = timers.t3 * 1000;
            }

            conn.connect();
            this.connections.set(protocolId, conn);

            (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
                if (event === 2) { // STARTDT_CON
                    console.log(`[IEC104] ✅ Connection established for Protocol ${protocolId}. Sending GI...`);
                    try {
                        (conn as any).connection.SendInterrogationCommand(6, asduAddress, 20);
                    } catch (err) {
                        console.error(`[IEC104] Failed to send GI:`, err);
                    }
                }
            }, null);
        } catch (err) {
            console.error(`[IEC104] Connection Error for ${protocolId}:`, err);
        }
    }

    public triggerGI(protocolId: string, asduAddress: number) {
        const conn = this.connections.get(protocolId);
        if (conn && (conn as any).connection) {
            console.log(`[IEC104] 🔄 Manually triggering GI for Protocol ${protocolId} (ASDU: ${asduAddress})`);
            try {
                (conn as any).connection.SendInterrogationCommand(6, asduAddress, 20);
                return true;
            } catch (err) {
                console.error(`[IEC104] Failed to send manual GI:`, err);
                return false;
            }
        }
        return false;
    }
}
