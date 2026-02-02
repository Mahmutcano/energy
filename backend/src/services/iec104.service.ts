import { io } from '../app';
import { Protocol } from 'iec104-protocol';
import { saveTelemetry } from '../utils/influx';

export class IEC104Service {
    private connections: Map<string, any> = new Map();

    public start() {
        console.log('IEC 60870-5-104 Master Service Started');
        this.connectToRTU('rtu-001', '127.0.0.1', 2404);
    }

    public connectToRTU(deviceId: string, ip: string, port: number) {
        console.log(`[IEC104] Connecting to REAL hardware at ${ip}:${port}...`);

        try {
            const conn = new Protocol(ip, port, (data: any[]) => {
                data.forEach(item => {
                    const payload = {
                        deviceId,
                        ioa: item.IOA, // Library uses uppercase
                        value: item.MeasuredValueShort || 0, // ASDU 13 specific key
                        unit: this.getUnitForIOA(item.IOA),
                        timestamp: new Date()
                    };

                    console.log(`[PROT-RECV] ${deviceId} | IOA: ${payload.ioa} | VAL: ${payload.value.toFixed(2)}`);

                    // Emit to UI
                    io.emit(`telemetry:${deviceId}:${payload.ioa}`, payload);

                    // Business Logic
                    saveTelemetry(deviceId, payload.ioa, payload.value, 'demo-cust');
                    this.checkAlarms(deviceId, payload.ioa, payload.value);
                });
            }, { autoReconnect: true, quiet: true });

            conn.connect();
            this.connections.set(deviceId, conn);

            console.log(`[IEC104] Connection established for ${deviceId}`);
        } catch (err) {
            console.error(`[IEC104] Connection Error:`, err);
        }
    }

    private getUnitForIOA(ioa: number): string {
        const units: Record<number, string> = {
            100: 'kW',
            101: 'V',
            102: 'A',
            103: 'Hz'
        };
        return units[ioa] || 'UNIT';
    }

    private checkAlarms(deviceId: string, ioa: number, value: number) {
        if (ioa === 100 && value > 300) {
            io.emit('alarm', {
                deviceId,
                ioa,
                message: `HIGH POWER ALERT: ${value.toFixed(2)} kW`,
                severity: 'CRITICAL',
                timestamp: new Date()
            });
        }
    }
}
