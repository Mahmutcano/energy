import * as Modbus from 'jsmodbus';
import * as net from 'net';
import redisService from './redis.service';

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

    public start() {
        console.log('Modbus TCP Master Service Started');
        // Initial connections can be loaded from DB here if needed
        // For now, we still connect to the simulator by default or wait for user input
        this.connectToDevice('modbus-sim-device', '127.0.0.1', 5020);
    }

    public connectToDevice(deviceId: string, ip: string, port: number) {
        if (this.clients.has(deviceId)) {
            console.log(`[Modbus] Device ${deviceId} already connecting/connected. skipping.`);
            return;
        }

        console.log(`[Modbus] Attempting connection to ${deviceId} at ${ip}:${port}...`);

        const socket = new net.Socket();
        const client = new Modbus.client.TCP(socket);

        socket.on('connect', () => {
            console.log(`[Modbus] ✅ Connected to ${deviceId} (${ip}:${port})`);
            this.startPolling(deviceId, client);
        });

        socket.on('error', (err) => {
            console.error(`[Modbus] ❌ Connection error for ${deviceId}:`, err.message);
        });

        socket.on('close', () => {
            console.log(`[Modbus] ⚠️ Connection closed for ${deviceId}. Reconnecting in 5s...`);
            const clientData = this.clients.get(deviceId);
            if (clientData) {
                if (clientData.pollingInterval) clearInterval(clientData.pollingInterval);
                setTimeout(() => socket.connect({ host: ip, port: port }), 5000);
            }
        });

        socket.connect({ host: ip, port: port });
        this.clients.set(deviceId, { client, socket });
    }

    private startPolling(deviceId: string, client: any) {
        // Polling loop for Holding Registers
        const pollingInterval = setInterval(async () => {
            try {
                const resp = await client.readHoldingRegisters(0, 10);
                const values = resp.response._body._values;

                values.forEach((val: number, index: number) => {
                    const address = index;
                    const payload = {
                        deviceId,
                        ioa: address,
                        value: val,
                        unit: this.getUnitForAddress(address),
                        name: this.getNameForAddress(address),
                        timestamp: new Date()
                    };
                    redisService.pushTelemetry(payload);
                });
            } catch (err) {
                // console.error(`[Modbus] Polling fail for ${deviceId}:`, err);
            }
        }, 5000);

        const clientData = this.clients.get(deviceId);
        if (clientData) {
            clientData.pollingInterval = pollingInterval;
        }
    }

    private getUnitForAddress(address: number): string {
        const units: Record<number, string> = {
            0: 'V',
            1: 'A',
            2: 'kW'
        };
        return units[address] || 'UNIT';
    }

    private getNameForAddress(address: number): string {
        const names: Record<number, string> = {
            0: 'Modbus Voltage',
            1: 'Modbus Current',
            2: 'Modbus Power'
        };
        return names[address] || `Register ${address}`;
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
