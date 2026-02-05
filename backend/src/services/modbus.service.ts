import * as Modbus from 'jsmodbus';
import * as net from 'net';
import redisService from './redis.service';

export class ModbusService {
    private clients: Map<string, { client: any, socket: net.Socket }> = new Map();

    public start() {
        console.log('Modbus TCP Master Service Started');
        // Connecting to our local simulator for testing
        this.connectToDevice('modbus-sim-device', '127.0.0.1', 5020);
    }

    public connectToDevice(deviceId: string, ip: string, port: number) {
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
            setTimeout(() => socket.connect({ host: ip, port: port }), 5000);
        });

        socket.connect({ host: ip, port: port });
        this.clients.set(deviceId, { client, socket });
    }

    private startPolling(deviceId: string, client: any) {
        // Polling loop for Holding Registers
        setInterval(async () => {
            try {
                // Reading first 10 registers as a demonstration
                const resp = await client.readHoldingRegisters(0, 10);
                const values = resp.response._body._values;

                values.forEach((val: number, index: number) => {
                    const address = index;
                    const payload = {
                        deviceId,
                        ioa: address, // Using address as IOA for dashboard compatibility
                        value: val,
                        unit: this.getUnitForAddress(address),
                        name: this.getNameForAddress(address),
                        timestamp: new Date()
                    };

                    // console.log(`[MODBUS-RECV] ${deviceId} | ADDR: ${address} | VAL: ${val}`);

                    // Push to Broker (Redis Queue)
                    redisService.pushTelemetry(payload);

                    // console.log(`[COLLECTOR] ${deviceId} -> Redis | ADDR: ${address}`);
                });
            } catch (err) {
                // console.error(`[Modbus] Polling fail for ${deviceId}:`, err);
            }
        }, 5000); // 5 second polling interval
    }

    private getUnitForAddress(address: number): string {
        // Map addresses to units (similar to IEC104 IOAs)
        const units: Record<number, string> = {
            0: 'V',
            1: 'A',
            2: 'kW'
        };
        return units[address] || 'UNIT';
    }

    private getNameForAddress(address: number): string {
        // Map addresses to names
        const names: Record<number, string> = {
            0: 'Modbus Voltage',
            1: 'Modbus Current',
            2: 'Modbus Power'
        };
        return names[address] || `Register ${address}`;
    }
}
