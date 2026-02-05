import { Protocol } from 'iec104-protocol';
import redisService from './redis.service';

export class IEC104Service {
    private connections: Map<string, any> = new Map();

    public start() {
        console.log('IEC 60870-5-104 Master Service Started');
        // Connecting to the provided WAN IP and Port
        this.connectToRTU('rtu-energy-wan', '178.242.103.255', 2404);
    }

    public connectToRTU(deviceId: string, ip: string, port: number) {
        console.log(`[IEC104] Connecting to REAL hardware at ${ip}:${port}...`);

        try {
            const conn = new Protocol(ip, port, (data: any[]) => {
                data.forEach(item => {

                    // Try to extract value from different ASDU types
                    const value = item.MeasuredValueShort ??
                        item.MeasuredValueNormalizedWithoutQuality ??
                        item.MeasuredValueScaled ??
                        item.val ?? 0;

                    const payload = {
                        deviceId,
                        ioa: item.IOA,
                        value: value,
                        unit: this.getUnitForIOA(item.IOA),
                        name: this.getIOAName(item.IOA),
                        timestamp: new Date()
                    };


                    // Push to Broker (Redis Queue)
                    redisService.pushTelemetry(payload);

                    console.log(`[COLLECTOR] ${deviceId} -> Redis | IOA: ${payload.ioa} | VAL: ${payload.value.toFixed(2)}`);
                });
            }, { autoReconnect: true, quiet: true });

            conn.connect();
            this.connections.set(deviceId, conn);

            console.log(`[IEC104] Connection sequence initiated for ${deviceId}`);

            // Set up connection handler to send GI as soon as STARTDT is confirmed
            (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
                // Event 2 is STARTDT_CON_RECEIVED (confirmed by 60870-helper.js)
                if (event === 2) {
                    console.log(`[IEC104] STARTDT_CON confirmed for ${deviceId}. Sending General Interrogation (CA: 15644)...`);
                    try {
                        // ASDU 100, COT: 6 (ACTIVATION), CA: 15644, QOI: 20 (Station Interrogation)
                        (conn as any).connection.SendInterrogationCommand(6, 15644, 20);
                    } catch (err) {
                        console.error(`[IEC104] Failed to send GI:`, err);
                    }
                } else if (event === 1) { // CLOSED
                    console.log(`[IEC104] Connection CLOSED for ${deviceId}`);
                }
            }, null);
        } catch (err) {
            console.error(`[IEC104] Connection Error:`, err);
        }
    }

    private getUnitForIOA(ioa: number): string {
        const units: Record<number, string> = {
            2034433: 'V',
            2034434: 'V',
            2034435: 'V',
            2034439: 'Hz',
            2032003: 'V',
            2032004: 'V',
            2032005: 'V',
            2032006: 'V',
            2032007: 'V',
            2032008: 'V'
        };
        return units[ioa] || 'UNIT';
    }

    private getIOAName(ioa: number): string {
        const names: Record<number, string> = {
            2034433: 'Van (User Specified)',
            2034434: 'Vbn (User Specified)',
            2034435: 'Vcn (User Specified)',
            2034439: 'System Frequency',
            2032003: 'Voltage Phase A (Van)',
            2032004: 'Voltage Phase B (Vbn)',
            2032005: 'Voltage Phase C (Vcn)',
            2032006: 'Voltage Line AB (Vab)',
            2032007: 'Voltage Line BC (Vbc)',
            2032008: 'Voltage Line CA (Vca)'
        };
        return names[ioa] || 'Unknown';
    }

}

