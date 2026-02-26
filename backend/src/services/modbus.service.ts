import * as Modbus from 'jsmodbus';
import * as net from 'net';
import redisService from './redis.service';
import prisma from '../lib/prisma';

export class ModbusService {
    private static instance: ModbusService;
    private clients: Map<string, { client: any, socket: net.Socket, pollingInterval?: NodeJS.Timeout }> = new Map();

    private constructor() { }

    public static getInstance(): ModbusService {
        if (!ModbusService.instance) {
            ModbusService.instance = new ModbusService();
        }
        return ModbusService.instance;
    }

    public async start() {
        console.log('[MODBUS] Master Service Started. Fetching configs from DB...');

        try {
            const protocols = await prisma.protocolConfig.findMany({
                where: {
                    protocolType: 'MODBUS',
                    isActive: true
                },
                include: {
                    modbusConfig: true,
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

            // Fallback for simulation if no DB records found yet or to keep it active
            this.connectToDevice('modbus-sim-device', '127.0.0.1', 5020, 1, []);

            for (const protocol of protocols) {
                if (!protocol.modbusConfig) continue;

                const config = protocol.modbusConfig;
                const pointsToPoll: any[] = [];

                for (const device of protocol.devices) {
                    if (device.datasheetProfile) {
                        for (const point of device.datasheetProfile.points) {
                            if (point.registerAddress !== null) {
                                pointsToPoll.push({
                                    address: point.registerAddress,
                                    deviceId: device.id,
                                    pointId: point.id,
                                    name: point.dataName,
                                    unit: point.dataValue || 'UNIT'
                                });
                            }
                        }
                    }
                }

                if (pointsToPoll.length > 0) {
                    this.connectToDevice(
                        protocol.id,
                        config.ipAddress,
                        config.port,
                        config.slaveId,
                        pointsToPoll
                    );
                }
            }
        } catch (error) {
            console.error('[MODBUS] Failed to load configs from DB:', error);
        }
    }

    public connectToDevice(protocolId: string, ip: string, port: number, slaveId: number, points: any[]) {
        if (this.clients.has(protocolId)) {
            return;
        }

        console.log(`[Modbus] Connecting to ${ip}:${port} (Slave: ${slaveId}) for Protocol ${protocolId}`);

        const socket = new net.Socket();
        const client = new Modbus.client.TCP(socket, slaveId);

        socket.on('connect', () => {
            console.log(`[Modbus] ✅ Connected to Protocol ${protocolId} at ${ip}:${port}`);
            this.startPolling(protocolId, client, points);
        });

        socket.on('error', (err) => {
            // console.error(`[Modbus] ❌ Error for ${protocolId}:`, err.message);
        });

        socket.on('close', () => {
            console.log(`[Modbus] ⚠️ Connection closed for ${protocolId}. Retrying...`);
            const clientData = this.clients.get(protocolId);
            if (clientData) {
                if (clientData.pollingInterval) clearInterval(clientData.pollingInterval);
                setTimeout(() => socket.connect({ host: ip, port: port }), 5000);
            }
        });

        socket.connect({ host: ip, port: port });
        this.clients.set(protocolId, { client, socket });
    }

    private startPolling(protocolId: string, client: any, points: any[]) {
        if (points.length === 0 && protocolId === 'modbus-sim-device') {
            // Simulator defaults if no points mapped
            points = [
                { address: 0, deviceId: 'modbus-sim-device', pointId: 'sim-v', name: 'Voltage', unit: 'V' },
                { address: 1, deviceId: 'modbus-sim-device', pointId: 'sim-i', name: 'Current', unit: 'A' },
                { address: 2, deviceId: 'modbus-sim-device', pointId: 'sim-p', name: 'Power', unit: 'kW' }
            ];
        }

        const pollingInterval = setInterval(async () => {
            for (const point of points) {
                try {
                    const resp = await client.readHoldingRegisters(point.address, 1);
                    const val = resp.response._body._values[0];

                    if (val !== undefined) {
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
                        // console.log(`[MODBUS] CH:${protocolId} ADDR:${point.address} VAL:${val}`);
                    }
                } catch (err) {
                    // console.error(`[MODBUS] Poll error CH:${protocolId} ADDR:${point.address}`);
                }
            }
        }, 1000); // 1 second polling for more responsive UI

        const clientData = this.clients.get(protocolId);
        if (clientData) clientData.pollingInterval = pollingInterval;
    }
    public async testModbusConnection(params: {
        ip: string,
        port: number,
        slaveId: number,
        address: number,
        quantity: number
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
                    console.log(`[Modbus Test] Connected to ${params.ip}:${params.port}`);
                    const resp = await client.readHoldingRegisters(params.address, params.quantity);
                    const body = (resp.response as any)._body;
                    resolved = true;
                    clearTimeout(timeout);
                    socket.end();
                    resolve({
                        success: true,
                        values: body._values,
                        rawData: body
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
