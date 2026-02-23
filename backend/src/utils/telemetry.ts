import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Veriyi Veritabanı (PostgreSQL) üzerine kaydeder.
 * Prisma üzerinden standard bir veritabanı kaydı olarak tutulur.
 */
export const saveTelemetry = async (deviceId: string, pointId: string, value: number) => {
    try {
        const data: Prisma.TelemetryValueUncheckedCreateInput = {
            device_id: deviceId,
            pointId: pointId,
            valueNumeric: value,
            measurementTime: new Date()
        };
        await prisma.telemetryValue.create({ data });
    } catch (err) {
        console.error('[TELEMETRY] Save Error:', err);
    }
};

/**
 * Geçmiş veriyi sorgular (Grafikler için)
 */
export const queryTelemetry = async (deviceId: string, pointId: string, hours: number = 1) => {
    try {
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const results = await prisma.telemetryValue.findMany({
            where: {
                device_id: deviceId,
                pointId: pointId,
                measurementTime: {
                    gte: startTime
                }
            },
            orderBy: {
                measurementTime: 'asc'
            }
        });

        return results.map(r => ({
            time: r.measurementTime,
            value: r.valueNumeric,
            deviceId: r.device_id,
            pointId: r.pointId
        }));
    } catch (err) {
        console.error('[TELEMETRY] Query Error:', err);
        return [];
    }
};
