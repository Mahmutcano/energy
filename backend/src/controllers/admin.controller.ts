import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and } from 'drizzle-orm';
import modbusService from '../services/modbus.service';
import { IEC104Service } from '../services/iec104.service';
import { Protocol } from 'iec104-protocol';

export const testModbus = async (req: Request, res: Response) => {
    try {
        const { ip, port, slaveId, address, functionCode } = req.body;

        const result = await modbusService.testModbusConnection({
            ip,
            port: Number(port),
            slaveId: Number(slaveId),
            address: Number(address),
            quantity: 1,
            functionCode: Number(functionCode || 3)
        });

        res.json(result);
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: err.message,
            code: err.code
        });
    }
};

export const testIEC104 = async (req: Request, res: Response) => {
    let conn: any = null;
    let resolved = false;

    try {
        const { ip, port, asduAddr } = req.body;
        const asdu = Number(asduAddr) || 1;
        const targetPort = Number(port) || 2404;

        console.log(`[IEC104] 🔍 Starting probe for ${ip}:${targetPort} (ASDU: ${asdu})`);

        const config = await db.query.iec104Config.findFirst({
            where: and(
                eq(schema.iec104Config.ipAddress, ip),
                eq(schema.iec104Config.port, targetPort)
            ),
            with: {
                protocol: {
                    with: {
                        devices: {
                            where: eq(schema.device.isActive, true),
                            with: {
                                datasheetProfile: {
                                    with: {
                                        points: { where: eq(schema.datasheetPoint.isActive, true) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const ioaMap = new Map<number, { name: string, unit: string, multiplier: number }[]>();
        if (config?.protocol) {
            config.protocol.devices.forEach(dev => {
                dev.datasheetProfile?.points.forEach(point => {
                    const registerPoints = [point.scadaAddress, point.ioa1ObjectAddress]
                        .filter(addr => addr !== null && addr !== undefined)
                        .map(Number);

                    for (const addr of registerPoints) {
                        if (!ioaMap.has(addr)) {
                            ioaMap.set(addr, []);
                        }
                        ioaMap.get(addr)!.push({
                            name: point.signalDescription || point.dataName,
                            unit: point.dataType || '',
                            multiplier: point.multiplier || 1
                        });
                    }
                });
            });
        }

        const receivedData: any[] = [];

        conn = new Protocol(ip, targetPort, (data: any[]) => {
            if (resolved) return;

            console.log(`[IEC104] 📥 Received ${data.length} PDUs from hardware`);

            const formatted = data
                .filter(item => item.CA === undefined || item.CA === asdu)
                .map(item => {
                    const mappings = ioaMap.get(item.IOA) || [];
                    const mapping = mappings[0];
                    const rawValue = item.MeasuredValueShort ??
                        item.MeasuredValueNormalizedWithoutQuality ??
                        item.MeasuredValueScaled ??
                        item.val ?? 0;

                    return {
                        ioa: item.IOA,
                        typeId: item.typeId,
                        value: mapping ? rawValue * mapping.multiplier : rawValue,
                        qds: item.qds,
                        description: mapping?.name,
                        unit: mapping?.unit
                    };
                });

            receivedData.push(...formatted);

            if (receivedData.length >= 1 && !resolved) {
                // Instead of resolving immediately, wait a few seconds for more packets
                setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    console.log(`[IEC104] ✅ Probe success: returning ${receivedData.length} points after delay`);

                    try { conn.close(); } catch (e) { }

                    if (!res.headersSent) {
                        res.json({ success: true, data: receivedData.slice(0, 200) });
                    }
                }, 3000);
            }
        }, { autoReconnect: false, quiet: true });

        if (conn && (conn as any).connection) {
            (conn as any).connection.SetConnectionHandler((param: any, event: number) => {
                console.log(`[IEC104] 💡 Connection Event: ${event}`);

                if (event === 2) { // STARTDT_CON
                    console.log(`[IEC104] 🚀 STARTDT Confirmed. Sending General Interrogation...`);
                    try {
                        (conn as any).connection.SendInterrogationCommand(6, asdu, 20);
                    } catch (err) {
                        console.error(`[IEC104] ❌ GI Send Error:`, err);
                    }
                } else if (event === 1) { // CLOSED
                    console.log(`[IEC104] 🔌 Connection closed by peer`);
                }
            }, null);
        }

        conn.connect();

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.warn(`[IEC104] ⏱️ Probe timed out for ${ip}`);
                try { conn.close(); } catch (e) { }

                if (!res.headersSent) {
                    if (receivedData.length > 0) {
                        res.json({ success: true, data: receivedData });
                    } else {
                        res.status(408).json({
                            success: false,
                            message: 'Hardware Timeout: No response received within 15 seconds. Ensure the IP/Port is reachable and ASDU address is correct.'
                        });
                    }
                }
            }
        }, 15000);

    } catch (err: any) {
        console.error(`[IEC104] 💥 Internal Error:`, err);
        if (conn) try { conn.close(); } catch (e) { }

        if (!res.headersSent) {
            res.status(500).json({ success: false, message: `System Error: ${err.message}` });
        }
    }
};

export const triggerManualGI = async (req: Request, res: Response) => {
    try {
        const { protocolId, asduAddr } = req.body;
        if (!protocolId) return res.status(400).json({ success: false, message: 'Protocol ID is required' });

        const iec104Service = IEC104Service.getInstance();
        const success = iec104Service.triggerGI(protocolId, Number(asduAddr) || 1);

        if (success) {
            res.json({ success: true, message: 'General Interrogation (GI) command sent successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Failed to send GI. Hardware might be disconnected or Protocol ID is invalid.' });
        }
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
};
