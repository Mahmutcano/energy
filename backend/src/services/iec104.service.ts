import { Protocol } from 'iec104-protocol';
import redisService from './redis.service';
import prisma from '../lib/prisma';

interface IOAMapEntry {
    dataSheetId: string;
    deviceId: string;
    description: string;
    unit: string;
}

export class IEC104Service {
    private connections: Map<string, any> = new Map();

    public async start() {
        console.log('[IEC104] Master Service Started. Fetching configs from DB...');

        try {
            // Fetch active protocols of type IEC104
            const protocols = await prisma.protocolConfig.findMany({
                where: {
                    protocolType: 'IEC104',
                    isActive: true
                },
                include: {
                    iec104Config: true,
                    devices: {
                        where: {
                            isActive: true
                        },
                        include: {
                            dataSheets: {
                                where: {
                                    isActive: true
                                }
                            }
                        }
                    }
                }
            });

            for (const protocol of protocols) {
                if (!protocol.iec104Config) {
                    console.warn(`[IEC104] Protocol ${protocol.id} has no IEC104 config, skipping.`);
                    continue;
                }

                const config = protocol.iec104Config;
                const ioaMap = new Map<number, IOAMapEntry>();
                let totalDataSheets = 0;

                for (const device of protocol.devices) {
                    for (const dataSheet of device.dataSheets) {
                        // SCADA ADRESİ = IOA address from the data sheet Excel
                        if (dataSheet.scadaAddress !== null && dataSheet.scadaAddress !== undefined) {
                            ioaMap.set(dataSheet.scadaAddress, {
                                dataSheetId: dataSheet.id,
                                deviceId: device.id,
                                description: dataSheet.signalDescription || dataSheet.dataName || 'Unknown',
                                unit: dataSheet.dataType || 'UNIT'
                            });
                            totalDataSheets++;
                        }
                    }
                }

                if (totalDataSheets > 0) {
                    this.connectToProtocol(
                        protocol.id,
                        config.ipAddress,
                        config.port,
                        config.asduAddr,
                        ioaMap
                    );
                } else {
                    console.warn(`[IEC104] Protocol ${protocol.id} has no valid SCADA Addresses (IOA) mapped to data sheets, skipping.`);
                }
            }
        } catch (error) {
            console.error('[IEC104] Failed to load configs from DB:', error);
        }
    }

    public connectToProtocol(protocolId: string, ip: string, port: number, asduAddress: number, ioaMap: Map<number, IOAMapEntry>) {
        console.log(`[IEC104] Connecting to REAL hardware at ${ip}:${port} for Protocol ID ${protocolId}...`);

        try {
            const conn = new Protocol(ip, port, (data: any[]) => {
                data.forEach(item => {
                    // Try to extract value from different ASDU types
                    const value = item.MeasuredValueShort ??
                        item.MeasuredValueNormalizedWithoutQuality ??
                        item.MeasuredValueScaled ??
                        item.val ?? 0;

                    const ioaEntry = ioaMap.get(item.IOA);

                    if (ioaEntry) {
                        const payload = {
                            protocolId: protocolId,
                            deviceId: ioaEntry.deviceId,
                            dataSheetId: ioaEntry.dataSheetId,
                            ioa: item.IOA,
                            value: value,
                            unit: ioaEntry.unit,
                            name: ioaEntry.description,
                            timestamp: new Date()
                        };

                        // Push to Broker (Redis Queue)
                        redisService.pushTelemetry(payload);

                        console.log(`[COLLECTOR] Protocol: ${protocolId} | IOA: ${payload.ioa} | VAL: ${payload.value.toFixed(2)} | NAME: ${payload.name}`);
                    }
                });
            }, { autoReconnect: true, quiet: true });

            conn.connect();
            this.connections.set(protocolId, conn);

            console.log(`[IEC104] Connection sequence initiated for Protocol ID ${protocolId}`);

            // Set up connection handler to send GI as soon as STARTDT is confirmed
            (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
                // Event 2 is STARTDT_CON_RECEIVED (confirmed by 60870-helper.js)
                if (event === 2) {
                    console.log(`[IEC104] STARTDT_CON confirmed for Protocol ${protocolId}. Sending General Interrogation (CA: ${asduAddress})...`);
                    try {
                        // ASDU 100, COT: 6 (ACTIVATION), CA: asduAddress, QOI: 20 (Station Interrogation)
                        (conn as any).connection.SendInterrogationCommand(6, asduAddress, 20);
                    } catch (err) {
                        console.error(`[IEC104] Failed to send GI for Protocol ${protocolId}:`, err);
                    }
                } else if (event === 1) { // CLOSED
                    console.log(`[IEC104] Connection CLOSED for Protocol ${protocolId}`);
                }
            }, null);
        } catch (err) {
            console.error(`[IEC104] Connection Error for Protocol ${protocolId}:`, err);
        }
    }
}
