
import { Protocol } from 'iec104-protocol';
import redisService from './redis.service';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { io } from '../app';

interface IOAMapEntry {
    pointId: string;
    deviceId: string;
    dataName: string;
    description: string;
    unit: string;
    multiplier: number;
}

export class IEC104Service {
    private static instance: IEC104Service;
    private connections: Map<string, any> = new Map();
    private ioaMaps: Map<string, Map<number, IOAMapEntry[]>> = new Map();
    private currentConfigs: Map<string, string> = new Map();
    private activeInstances: Map<string, { id: string, ip: string }> = new Map();
    private asduAddresses: Map<string, number> = new Map(); // Store ASDU per protocol

    private statuses: Map<string, 'CONNECTED' | 'DISCONNECTED' | 'ERROR'> = new Map();
    private giIntervalId: ReturnType<typeof setInterval> | null = null;

    private constructor() { }

    public static getInstance(): IEC104Service {
        if (!IEC104Service.instance) {
            IEC104Service.instance = new IEC104Service();
        }
        return IEC104Service.instance;
    }

    public async start() {
        console.log('[IEC104] Master Service Started.');
        await this.reloadConfigs();
        this.startPeriodicGI();
        this.startPeriodicReload();
    }

    /** Periodic config check to ensure systematic recovery of failed devices */
    private startPeriodicReload() {
        setInterval(async () => {
            console.log('[IEC104] 🕒 Periodic systematic config check...');
            await this.reloadConfigs();
        }, 60000); // Check every 60 seconds
    }

    /** Send GI to all connected protocols every 30 seconds */
    private startPeriodicGI() {
        if (this.giIntervalId) clearInterval(this.giIntervalId);
        this.giIntervalId = setInterval(() => {
            for (const [protocolId, conn] of this.connections.entries()) {
                const status = this.statuses.get(protocolId);
                const asdu = this.asduAddresses.get(protocolId);
                if (status !== 'CONNECTED' || !asdu) continue;

                try {
                    const connection = (conn as any).connection;
                    if (connection) {
                        connection.SendInterrogationCommand(6, asdu, 20);
                        console.log(`[IEC104] 🔄 Periodic GI sent for ${protocolId} (ASDU: ${asdu})`);
                    }
                } catch (err) {
                    console.warn(`[IEC104] ⚠️ Periodic GI failed for ${protocolId}:`, err);
                }
            }
        }, 30000); // Every 30 seconds
    }

    public getStatuses() {
        return Object.fromEntries(this.statuses);
    }

    private updateStatus(protocolId: string, status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR') {
        this.statuses.set(protocolId, status);
        io.emit('protocol:status', { protocolId, status, timestamp: new Date() });
    }

    public async reloadConfigs() {
        console.log('[IEC104] 🔄 Reloading Protocol configurations from DB...');
        try {
            const protocols = await db.query.protocolConfig.findMany({
                where: and(
                    eq(schema.protocolConfig.protocolType, 'IEC104'),
                    eq(schema.protocolConfig.isActive, true)
                ),
                with: {
                    iec104Config: true,
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

            const activeProtocolIds = new Set<string>();

            for (const protocol of protocols) {
                if (!protocol.iec104Config) continue;
                activeProtocolIds.add(protocol.id);

                const config = protocol.iec104Config;
                const configHash = `${config.ipAddress}:${config.port}:${config.asduAddr}`;

                // Check if config changed (Restart if changed)
                if (this.currentConfigs.has(protocol.id) && this.currentConfigs.get(protocol.id) !== configHash) {
                    console.log(`[IEC104] ⚠️ IP/Config changed for Protocol ${protocol.id} (${this.currentConfigs.get(protocol.id)} -> ${configHash}). Killing old connection.`);
                    this.stopProtocol(protocol.id);
                }

                // Build IOA Map (Per-protocol sandbox)
                const ioaMap = new Map<number, IOAMapEntry[]>();
                for (const device of protocol.devices) {
                    if (device.datasheetProfile) {
                        for (const point of device.datasheetProfile.points) {
                            const entry: IOAMapEntry = {
                                pointId: point.id,
                                deviceId: device.id,
                                dataName: point.dataName,
                                description: point.signalDescription || point.dataName || 'Unknown',
                                unit: point.dataType || point.dataValue || 'UNIT',
                                multiplier: point.multiplier || 1
                            };

                            const registerPoints = [point.scadaAddress, point.ioa1ObjectAddress]
                                .filter(addr => addr !== null && addr !== undefined)
                                .map(Number);

                            for (const addr of registerPoints) {
                                if (!ioaMap.has(addr)) ioaMap.set(addr, []);
                                ioaMap.get(addr)!.push(entry);
                            }
                        }
                    }
                }

                this.ioaMaps.set(protocol.id, ioaMap);

                // Establish connection if not already present
                if (!this.connections.has(protocol.id)) {
                    this.currentConfigs.set(protocol.id, configHash);
                    this.statuses.set(protocol.id, 'DISCONNECTED');
                    this.connectToProtocol(
                        protocol.id,
                        config.ipAddress,
                        config.port,
                        config.asduAddr,
                        { t1: config.t1, t2: config.t2, t3: config.t3 }
                    );
                }
            }

            // Cleanup removed protocols
            for (const existingId of Array.from(this.connections.keys())) {
                if (!activeProtocolIds.has(existingId)) {
                    console.log(`[IEC104] 🛑 Protocol ${existingId} is no longer active in DB. Stopping.`);
                    this.stopProtocol(existingId);
                }
            }

        } catch (error) {
            console.error('[IEC104] Failed to reload configs:', error);
        }
    }

    public stopProtocol(protocolId: string) {
        this.activeInstances.delete(protocolId); // Instantly invalidate all callbacks
        const conn = this.connections.get(protocolId);
        if (conn) {
            console.log(`[IEC104] 🧨 Forcefully destroying connection for ${protocolId}`);
            try {
                const connection = (conn as any).connection;
                if (connection?.socket) {
                    connection.socket.destroy();
                    console.log(`[IEC104] ⚡ Socket destroyed for ${protocolId}`);
                }
            } catch (e) { }
            this.connections.delete(protocolId);
            this.currentConfigs.delete(protocolId);
            this.ioaMaps.delete(protocolId);
            this.updateStatus(protocolId, 'DISCONNECTED');
        }
    }

    public connectToProtocol(protocolId: string, ip: string, port: number, asduAddress: number, timers: { t1: number, t2: number, t3: number }) {
        const instanceId = Math.random().toString(36).substring(7);
        this.activeInstances.set(protocolId, { id: instanceId, ip });
        this.asduAddresses.set(protocolId, asduAddress);

        console.log(`[IEC104] 🔌 [Instance:${instanceId}] Connecting to REAL Target ${ip}:${port} (ASDU: ${asduAddress})`);

        try {
            const conn = new Protocol(ip, port, (data: any[]) => {
                // GHOST SAFETY: Ensure this instance belongs to the current IP config
                const current = this.activeInstances.get(protocolId);
                if (!current || current.id !== instanceId) {
                    console.log(`[IEC104] 👻 Ghost data rejected from defunct Instance:${instanceId} (Target was ${ip})`);
                    try { (conn as any).connection?.socket?.destroy(); } catch (e) { }
                    return;
                }

                this.updateStatus(protocolId, 'CONNECTED');
                const ioaMap = this.ioaMaps.get(protocolId) || new Map<number, IOAMapEntry[]>();



                const rawPoints = data
                    .filter(item => item.CA === undefined || item.CA === asduAddress)
                    .map(item => {
                        const entries = ioaMap.get(item.IOA) || [];
                        const firstEntry = entries[0];
                        const rawValue = item.MeasuredValueShort ?? item.MeasuredValueNormalizedWithoutQuality ?? item.MeasuredValueScaled ?? item.val ?? 0;

                        return {
                            ioa: item.IOA,
                            typeId: item.typeId,
                            value: firstEntry ? rawValue * firstEntry.multiplier : rawValue,
                            qds: item.qds,
                            timestamp: new Date(),
                            name: firstEntry?.dataName || 'Unmapped Point',
                            deviceId: firstEntry?.deviceId,
                            sourceIp: ip
                        };
                    });

                // Emit only to targeted topic. UI MUST check deviceId.
                if (rawPoints.length > 0) {
                    io.emit(`telemetry:raw:${protocolId}`, rawPoints);
                }

                data.forEach(item => {
                    if (item.CA !== undefined && item.CA !== asduAddress) return;

                    const value = item.MeasuredValueShort ?? item.MeasuredValueNormalizedWithoutQuality ?? item.MeasuredValueScaled ?? item.val ?? 0;
                    const ioaEntries = ioaMap.get(item.IOA);
                    if (ioaEntries) {
                        for (const entry of ioaEntries) {
                            redisService.pushTelemetry({
                                protocolId,
                                deviceId: entry.deviceId,
                                pointId: entry.pointId,
                                ioa: item.IOA,
                                typeId: item.typeId,
                                value: value * entry.multiplier,
                                qds: item.qds,
                                unit: entry.unit,
                                name: entry.description,
                                timestamp: new Date()
                            });
                        }
                    }
                });
            }, { autoReconnect: true, quiet: true });

            if ((conn as any).connection) {
                (conn as any).connection.t1 = timers.t1 * 1000;
                (conn as any).connection.t2 = timers.t2 * 1000;
                (conn as any).connection.t3 = timers.t3 * 1000;

                (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
                    if (this.activeInstances.get(protocolId)?.id !== instanceId) return;

                    if (event === 2) {
                        console.log(`[IEC104] ✅ Established: [Instance:${instanceId}] -> ${ip}:${port}`);
                        this.updateStatus(protocolId, 'CONNECTED');
                        try {
                            (conn as any).connection.SendInterrogationCommand(6, asduAddress, 20);
                        } catch (err) { }
                    } else if (event === 1) { // CLOSED
                        this.updateStatus(protocolId, 'DISCONNECTED');
                    } else if (event === 4) { // ERROR
                        this.updateStatus(protocolId, 'ERROR');
                    }
                }, null);
            }

            conn.connect();
            this.connections.set(protocolId, conn);
        } catch (err) {
            console.error(`[IEC104] ❌ Connection failed for ${protocolId}:`, err);
            this.updateStatus(protocolId, 'ERROR');
        }
    }

    public triggerGI(protocolId: string, asduAddress: number): boolean {
        const conn = this.connections.get(protocolId);
        if (!conn) return false;

        try {
            const connection = (conn as any).connection;
            if (connection) {
                console.log(`[IEC104] 📡 Manually triggering GI for ${protocolId} (ASDU: ${asduAddress})`);
                connection.SendInterrogationCommand(6, asduAddress, 20);
                return true;
            }
        } catch (err) {
            console.error(`[IEC104] ❌ Failed to send manual GI for ${protocolId}:`, err);
        }
        return false;
    }
}
