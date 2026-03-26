
import * as Modbus from 'jsmodbus';
import * as net from 'net';
import redisService from './redis.service';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class ModbusService {
    private static instance: ModbusService;
    private clients: Map<string, { client: any, socket: net.Socket, pollingInterval?: NodeJS.Timeout }> = new Map();
    private statuses: Map<string, 'CONNECTED' | 'DISCONNECTED' | 'ERROR'> = new Map();
    private currentConfigsHash: Map<string, string> = new Map();
    private activeInstances: Map<string, string> = new Map(); // protocolId -> instanceId

    private constructor() { }

    public static getInstance(): ModbusService {
        if (!ModbusService.instance) {
            ModbusService.instance = new ModbusService();
        }
        return ModbusService.instance;
    }

    public async start() {
        console.log('[MODBUS] Master Service Starting...');
        await this.reloadConfigs();
        this.startPeriodicReload();
    }

    /** Periodic config check to ensure systematic recovery of failed devices */
    private startPeriodicReload() {
        setInterval(async () => {
            console.log('[MODBUS] 🕒 Periodic systematic config check...');
            await this.reloadConfigs();
        }, 60000); // Check every 60 seconds
    }

    public getStatuses() {
        return Object.fromEntries(this.statuses);
    }

    private updateStatus(protocolId: string, status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR') {
        const io = (global as any).io;
        this.statuses.set(protocolId, status);
        if (io) io.emit('protocol:status', { protocolId, status, timestamp: new Date() });
    }

    public async reloadConfigs() {
        console.log('[MODBUS] Refreshing configuration from DB...');

        try {
            const protocols = await db.query.protocolConfig.findMany({
                where: and(
                    eq(schema.protocolConfig.protocolType, 'MODBUS'),
                    eq(schema.protocolConfig.isActive, true)
                ),
                with: {
                    modbusConfig: true,
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
                if (!protocol.modbusConfig) continue;
                activeProtocolIds.add(protocol.id);

                const config = protocol.modbusConfig;
                const configHash = `${config.ipAddress}:${config.port}:${config.slaveId}`;

                if (this.currentConfigsHash.has(protocol.id) && this.currentConfigsHash.get(protocol.id) !== configHash) {
                    console.log(`[Modbus] 🔄 Config changed for Protocol ${protocol.id}. Restarting...`);
                    this.stopProtocol(protocol.id);
                }

                const pointsToPoll: any[] = [];
                for (const device of protocol.devices) {
                    if (device.datasheetProfile) {
                        for (const point of device.datasheetProfile.points) {
                            if (point.address !== null && point.address !== undefined) {
                                pointsToPoll.push({
                                    address: point.address,
                                    deviceId: device.id,
                                    pointId: point.id,
                                    name: point.data,
                                    unit: point.dataType || 'UNIT',
                                    functionCode: point.functionCode || 3,
                                    multiplier: point.multiplier || 1,
                                    wordSwap: point.wordSwap || false,
                                    dataType: (point.dataType || 'int16').toLowerCase().replace('float', 'float32').replace('long', 'int32').replace('double', 'float32')
                                });
                            }
                        }
                    }
                }

                if (pointsToPoll.length > 0 && !this.clients.has(protocol.id)) {
                    this.currentConfigsHash.set(protocol.id, configHash);
                    this.statuses.set(protocol.id, 'DISCONNECTED');
                    this.connectToDevice(
                        protocol.id,
                        config.ipAddress,
                        config.port,
                        config.slaveId,
                        pointsToPoll
                    );
                }
            }

            // Cleanup
            for (const existingId of this.clients.keys()) {
                if (!activeProtocolIds.has(existingId)) {
                    console.log(`[Modbus] 🛑 Stopping non-active Protocol ${existingId}`);
                    this.stopProtocol(existingId);
                }
            }

        } catch (error) {
            console.error('[MODBUS] Failed to load configs from DB:', error);
        }
    }

    public stopProtocol(protocolId: string) {
        this.activeInstances.delete(protocolId); // Kill switch for polling
        const data = this.clients.get(protocolId);
        if (data) {
            if (data.pollingInterval) clearInterval(data.pollingInterval);
            data.socket.destroy();
            this.clients.delete(protocolId);
            this.currentConfigsHash.delete(protocolId);
            this.updateStatus(protocolId, 'DISCONNECTED');
        }
    }

    public connectToDevice(protocolId: string, ip: string, port: number, slaveId: number, points: any[]) {
        if (this.clients.has(protocolId)) return;

        const instanceId = Math.random().toString(36).substring(7);
        this.activeInstances.set(protocolId, instanceId);

        console.log(`[Modbus] 🔌 [Instance:${instanceId}] Connecting to ${ip}:${port} for Protocol ${protocolId}`);

        const socket = new net.Socket();
        const client = new Modbus.client.TCP(socket, slaveId);

        socket.on('connect', () => {
            if (this.activeInstances.get(protocolId) !== instanceId) {
                socket.destroy();
                return;
            }
            console.log(`[Modbus] ✅ Connected [Instance:${instanceId}]`);
            this.updateStatus(protocolId, 'CONNECTED');
            this.startPolling(protocolId, client, points, instanceId);
        });

        socket.on('error', (err) => {
            if (this.activeInstances.get(protocolId) !== instanceId) return;
            this.updateStatus(protocolId, 'ERROR');
        });

        socket.on('close', () => {
            if (this.activeInstances.get(protocolId) !== instanceId) return;
            this.updateStatus(protocolId, 'DISCONNECTED');

            const clientData = this.clients.get(protocolId);
            if (clientData) {
                if (clientData.pollingInterval) clearInterval(clientData.pollingInterval);
                setTimeout(() => {
                    try {
                        if (this.clients.has(protocolId) && this.activeInstances.get(protocolId) === instanceId) {
                            socket.connect({ host: ip, port: port });
                        }
                    } catch (e) { }
                }, 5000);
            }
        });

        try { socket.connect({ host: ip, port: port }); } catch (e) { }
        this.clients.set(protocolId, { client, socket });
    }

    private startPolling(protocolId: string, client: any, points: any[], instanceId: string) {
        if (points.length === 0) return;

        const pollingInterval = setInterval(async () => {
            // GHOST CHECK
            if (this.activeInstances.get(protocolId) !== instanceId) {
                console.log(`[Modbus] 👻 Stopping ghost polling for Instance:${instanceId}`);
                clearInterval(pollingInterval);
                return;
            }

            for (const point of points) {
                try {
                    const count = (point.dataType === 'float32' || point.dataType === 'int32' || point.dataType === 'uint32') ? 2 : 1;

                    let resp;
                    if (point.functionCode === 4) {
                        resp = await client.readInputRegisters(point.address, count);
                    } else {
                        resp = await client.readHoldingRegisters(point.address, count);
                    }

                    const rawValues = resp.response._body._values;
                    if (rawValues === undefined || rawValues.length < count) continue;

                    let val: number = 0;
                    const buffer = Buffer.alloc(count * 2);

                    if (count === 1) {
                        buffer.writeUInt16BE(rawValues[0], 0);
                        if (point.dataType === 'int16') {
                            val = buffer.readInt16BE(0);
                        } else {
                            val = buffer.readUInt16BE(0);
                        }
                    } else if (count === 2) {
                        if (point.wordSwap) {
                            buffer.writeUInt16BE(rawValues[1], 0);
                            buffer.writeUInt16BE(rawValues[0], 2);
                        } else {
                            buffer.writeUInt16BE(rawValues[0], 0);
                            buffer.writeUInt16BE(rawValues[1], 2);
                        }

                        if (point.dataType === 'float32') {
                            val = buffer.readFloatBE(0);
                        } else if (point.dataType === 'int32') {
                            val = buffer.readInt32BE(0);
                        } else {
                            val = buffer.readUInt32BE(0);
                        }
                    }

                    val = val * (point.multiplier || 1);

                        redisService.pushTelemetry({
                            protocolId,
                            deviceId: point.deviceId,
                            pointId: point.pointId,
                            ioa: point.address,
                            value: val,
                            unit: point.unit,
                            name: point.name,
                            timestamp: new Date()
                        });
                    } catch (err: any) {
                        console.warn(`[Modbus] ⚠️ Poll Error [Protocol: ${protocolId}|Addr: ${point.address}]: ${err.message || 'Unknown'}`);
                        // Update status to ERROR if multiple fails occur (handled by updateStatus)
                        if (err.message && (err.message.includes('timeout') || err.message.includes('ECONN'))) {
                            this.updateStatus(protocolId, 'ERROR');
                        }
                    }
                }
        }, 250);

        const clientData = this.clients.get(protocolId);
        if (clientData) clientData.pollingInterval = pollingInterval;
    }

    public async testModbusConnection(params: {
        ip: string,
        port: number,
        slaveId: number,
        address: number,
        quantity: number,
        functionCode?: number,
        dataType?: string
    }): Promise<any> {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            const client = new Modbus.client.TCP(socket, params.slaveId);
            let resolved = false;

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                    reject(new Error('Connection timeout (10s)'));
                }
            }, 10000);

            socket.on('connect', async () => {
                try {
                    let resp;
                    const fc = Number(params.functionCode || 3);
                    if (fc === 4) {
                        resp = await client.readInputRegisters(params.address, params.quantity);
                    } else {
                        resp = await client.readHoldingRegisters(params.address, params.quantity);
                    }
                    
                    const values = resp.response.body.values || (resp.response.body as any)._values;
                    let decodedValue: any = values;

                    if (params.dataType && values.length > 0) {
                        const buffer = Buffer.alloc(values.length * 2);
                        for (let i = 0; i < values.length; i++) {
                            buffer.writeUInt16BE(values[i], i * 2);
                        }

                        const type = params.dataType.toUpperCase();
                        if (type === 'BYTE' || type === 'USINT') decodedValue = buffer.length >= 1 ? buffer.readUInt8(0) : values[0];
                        else if (type === 'SINT') decodedValue = buffer.length >= 1 ? buffer.readInt8(0) : values[0];
                        else if (type === 'WORD' || type === 'UINT') decodedValue = buffer.length >= 2 ? buffer.readUInt16BE(0) : values[0];
                        else if (type === 'INT') decodedValue = buffer.length >= 2 ? buffer.readInt16BE(0) : values[0];
                        else if (type === 'DWORD' || type === 'UDINT') decodedValue = buffer.length >= 4 ? buffer.readUInt32BE(0) : values[0];
                        else if (type === 'DINT') decodedValue = buffer.length >= 4 ? buffer.readInt32BE(0) : values[0];
                        else if (type === 'FLOAT32' || type === 'REAL') decodedValue = buffer.length >= 4 ? buffer.readFloatBE(0) : values[0];
                        else if (type === 'DOUBLE64') decodedValue = buffer.length >= 8 ? buffer.readDoubleBE(0) : values[0];
                    }

                    resolved = true;
                    clearTimeout(timeout);
                    socket.end();
                    resolve({
                        success: true,
                        values: values,
                        decodedValue: decodedValue,
                        rawData: resp.response.body
                    });
                } catch (err: any) {
                    resolved = true;
                    clearTimeout(timeout);
                    socket.destroy();
                    reject(err);
                }
            });

            socket.on('error', (err) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    socket.destroy();
                    reject(err);
                }
            });

            socket.connect({ host: params.ip, port: params.port });
        });
    }
}

export default ModbusService.getInstance();
