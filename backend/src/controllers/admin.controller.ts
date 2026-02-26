import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import modbusService from '../services/modbus.service';
import { IEC104Service } from '../services/iec104.service';

export const testModbus = async (req: Request, res: Response) => {
    try {
        const { ip, port, slaveId, address, functionCode } = req.body;

        // Note: For now we only support Reading Holding Registers (03)
        if (functionCode !== '03' && functionCode !== 3) {
            return res.status(400).json({ message: 'Şu an sadece "03 - Read Holding Registers" desteklenmektedir.' });
        }

        const result = await modbusService.testModbusConnection({
            ip,
            port: Number(port),
            slaveId: Number(slaveId),
            address: Number(address),
            quantity: 1
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
import { Protocol } from 'iec104-protocol';

export const testIEC104 = async (req: Request, res: Response) => {
    let conn: any = null;
    let resolved = false;

    try {
        const { ip, port, asduAddr } = req.body;
        const asdu = Number(asduAddr) || 1;
        const targetPort = Number(port) || 2404;

        console.log(`[IEC104] 🔍 Starting probe for ${ip}:${targetPort} (ASDU: ${asdu})`);

        // Fetch IOA mapping for this protocol if it exists in DB
        const protocol = await prisma.protocolConfig.findFirst({
            where: {
                iec104Config: {
                    ipAddress: ip,
                    port: targetPort
                }
            },
            include: {
                devices: {
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

        const ioaMap = new Map<number, { name: string, unit: string }>();
        if (protocol) {
            protocol.devices.forEach(dev => {
                dev.datasheetProfile?.points.forEach(point => {
                    if (point.scadaAddress !== null) {
                        ioaMap.set(point.scadaAddress, {
                            name: point.signalDescription || point.dataName,
                            unit: point.dataType || ''
                        });
                    }
                });
            });
        }

        const receivedData: any[] = [];

        conn = new Protocol(ip, targetPort, (data: any[]) => {
            if (resolved) return;

            console.log(`[IEC104] 📥 Received ${data.length} PDUs from hardware`);

            const formatted = data.map(item => {
                const mapping = ioaMap.get(item.IOA);
                return {
                    ioa: item.IOA,
                    typeId: item.typeId,
                    value: item.MeasuredValueShort ??
                        item.MeasuredValueNormalizedWithoutQuality ??
                        item.MeasuredValueScaled ??
                        item.val ?? 0,
                    qds: item.qds,
                    description: mapping?.name,
                    unit: mapping?.unit
                };
            });

            receivedData.push(...formatted);

            // Respond as soon as we get some data
            if (receivedData.length >= 1) {
                resolved = true;
                console.log(`[IEC104] ✅ Probe success: returning ${receivedData.length} points`);

                // Cleanup connection before responding
                try { conn.close(); } catch (e) { }

                if (!res.headersSent) {
                    res.json({ success: true, data: receivedData.slice(0, 100) });
                }
            }
        }, { autoReconnect: false, quiet: true });

        // Set up connection state monitor
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

        // Safety Timeout
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
