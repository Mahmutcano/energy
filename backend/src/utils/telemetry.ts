import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Save single telemetry record (legacy, prefer saveTelemetryBatch).
 */
export const saveTelemetry = async (deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: Buffer) => {
    try {
        await prisma.telemetryValue.create({
            data: {
                device_id: deviceId,
                pointId: pointId,
                valueNumeric: value,
                measurementTime: timestamp || new Date(),
                quality: quality,
                rawPayload: rawPayload as any
            }
        });
    } catch (err) {
        console.error('[TELEMETRY] Save Error:', err);
    }
};

/**
 * Batch save telemetry records.
 * Uses Prisma createMany for efficient bulk inserts.
 */
export const saveTelemetryBatch = async (items: Array<{ deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: Buffer }>) => {
    try {
        if (items.length === 0) return;

        const data: Prisma.TelemetryValueUncheckedCreateInput[] = items.map(item => ({
            device_id: item.deviceId,
            pointId: item.pointId,
            valueNumeric: item.value,
            measurementTime: item.timestamp || new Date(),
            quality: item.quality,
            rawPayload: item.rawPayload as any
        }));

        await prisma.telemetryValue.createMany({
            data,
            skipDuplicates: false
        });
    } catch (err) {
        console.error('[TELEMETRY_BATCH] Save Error:', err);
    }
};

/**
 * Query historical telemetry data with server-side limit + pagination
 * to avoid returning unbounded result sets.
 */
export const queryTelemetry = async (
    deviceId: string,
    pointId: string,
    hours?: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 5000 // Default limit to prevent memory issues
) => {
    try {
        const queryWhere: any = {
            device_id: deviceId,
            pointId: pointId,
        };

        if (startDate || endDate) {
            queryWhere.measurementTime = {};
            if (startDate) queryWhere.measurementTime.gte = startDate;
            if (endDate) queryWhere.measurementTime.lte = endDate;
        } else {
            const h = hours || 1;
            queryWhere.measurementTime = {
                gte: new Date(Date.now() - h * 60 * 60 * 1000)
            };
        }

        const results = await prisma.telemetryValue.findMany({
            where: queryWhere,
            orderBy: { measurementTime: 'asc' },
            take: limit,
            select: {
                measurementTime: true,
                valueNumeric: true,
                device_id: true,
                pointId: true
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

/**
 * Fast approximate count using pg_stat - avoids slow COUNT(*) on large tables.
 */
export const getApproximateTelemetryCount = async (): Promise<number> => {
    try {
        const result: any[] = await prisma.$queryRawUnsafe(
            `SELECT reltuples::bigint AS count FROM pg_class WHERE relname = 'TelemetryValue'`
        );
        return Number(result[0]?.count || 0);
    } catch {
        // Fallback to exact count
        return prisma.telemetryValue.count();
    }
};
