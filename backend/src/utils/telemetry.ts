
import { db } from '../db';
import { telemetryValue } from '../db/schema';
import { eq, and, gte, lte, asc, desc, sql } from 'drizzle-orm';

/**
 * Save single telemetry record via Drizzle
 */
export const saveTelemetry = async (deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: string) => {
    try {
        await db.insert(telemetryValue).values({
            deviceId: deviceId,
            pointId: pointId,
            valueNumeric: value,
            measurementTime: timestamp || new Date(),
            quality: quality,
            rawPayload: rawPayload
        });
    } catch (err) {
        console.error('[TELEMETRY] Drizzle Save Error:', err);
    }
};

/**
 * Batch save telemetry records via Drizzle
 * Highly efficient for high-traffic SCADA data.
 */
export const saveTelemetryBatch = async (items: Array<{ deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: string }>) => {
    if (items.length === 0) return;

    try {
        const data = items.map(item => ({
            deviceId: item.deviceId,
            pointId: item.pointId,
            valueNumeric: item.value,
            measurementTime: item.timestamp || new Date(),
            quality: item.quality,
            rawPayload: item.rawPayload
        }));

        await db.insert(telemetryValue).values(data);
    } catch (err: any) {
        console.error('[TELEMETRY_BATCH] Drizzle Error:', err.message);
    }
};

/**
 * Query historical telemetry data with Drizzle
 */
export const queryTelemetry = async (
    deviceId: string,
    pointId: string,
    hours?: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50000
) => {
    try {
        let whereClause;

        if (startDate || endDate) {
            const conditions = [
                eq(telemetryValue.deviceId, deviceId),
                eq(telemetryValue.pointId, pointId)
            ];
            if (startDate) conditions.push(gte(telemetryValue.measurementTime, startDate));
            if (endDate) conditions.push(lte(telemetryValue.measurementTime, endDate));
            whereClause = and(...conditions);
        } else {
            const h = hours || 1;
            const startTime = new Date(Date.now() - h * 60 * 60 * 1000);
            whereClause = and(
                eq(telemetryValue.deviceId, deviceId),
                eq(telemetryValue.pointId, pointId),
                gte(telemetryValue.measurementTime, startTime)
            );
        }

        const results = await db.select({
            measurementTime: telemetryValue.measurementTime,
            valueNumeric: telemetryValue.valueNumeric,
            deviceId: telemetryValue.deviceId,
            pointId: telemetryValue.pointId
        })
            .from(telemetryValue)
            .where(whereClause)
            .orderBy(asc(telemetryValue.measurementTime))
            .limit(limit);

        return results.map(r => ({
            time: r.measurementTime,
            value: r.valueNumeric,
            deviceId: r.deviceId,
            pointId: r.pointId
        }));
    } catch (err) {
        console.error('[TELEMETRY] Query Error:', err);
        return [];
    }
};

/**
 * Fast approximate count using pg_stat
 */
export const getApproximateTelemetryCount = async (): Promise<number> => {
    try {
        const result = await db.execute(sql`SELECT reltuples::bigint AS count FROM pg_class WHERE relname = 'TelemetryValue'`);
        return Number(result.rows[0]?.count || 0);
    } catch {
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(telemetryValue);
        return Number(countResult[0]?.count || 0);
    }
};
