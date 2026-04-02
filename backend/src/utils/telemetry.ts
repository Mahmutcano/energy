import { db, timescaleDb } from '../db';
import { telemetryValue } from '../db/schema';
import { eq, and, gte, lte, asc, sql } from 'drizzle-orm';

/**
 * Initialize TimescaleDB: Create table and hypertable if not exists
 */
export const initTimescaleDb = async () => {
    console.log('[TIMESCALE] Initializing telemetry hypertable...');
    try {
        // 1. Create table (lowercase names for PG consistency)
        await timescaleDb.execute(sql`
            CREATE TABLE IF NOT EXISTS "TelemetryValue" (
                "id" bigint GENERATED ALWAYS AS IDENTITY,
                "deviceId" uuid NOT NULL,
                "pointId" uuid NOT NULL,
                "measurementTime" timestamp with time zone NOT NULL,
                "valueNumeric" double precision,
                "quality" smallint,
                "rawPayload" text
            )
        `);

        // 2. Convert to hypertable
        await timescaleDb.execute(sql`
            SELECT create_hypertable('"TelemetryValue"', 'measurementTime', if_not_exists => TRUE);
        `).catch(err => {
            if (err.message.includes('already a hypertable')) return;
            console.warn('[TIMESCALE] Hypertable creation warning:', err.message);
        });

        // 3. Add indices
        await timescaleDb.execute(sql`CREATE INDEX IF NOT EXISTS tv_point_time_idx ON "TelemetryValue" ("pointId", "measurementTime" DESC)`);
        await timescaleDb.execute(sql`CREATE INDEX IF NOT EXISTS tv_device_time_idx ON "TelemetryValue" ("deviceId", "measurementTime" DESC)`);

        console.log('[TIMESCALE] Initialization complete.');
    } catch (err) {
        console.error('[TIMESCALE] Initialization error:', err);
    }
};

/**
 * Save single telemetry record via Drizzle (TimescaleDB)
 */
export const saveTelemetry = async (deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: string) => {
    try {
        await timescaleDb.insert(telemetryValue).values({
            deviceId: deviceId,
            pointId: pointId,
            valueNumeric: value,
            measurementTime: timestamp || new Date(),
            quality: quality,
            rawPayload: rawPayload
        });
    } catch (err) {
        console.error('[TELEMETRY] Timescale Save Error:', err);
    }
};

/**
 * Batch save telemetry records via Drizzle (TimescaleDB) with retry
 */
export const saveTelemetryBatch = async (items: Array<{ deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: string }>) => {
    if (items.length === 0) return;

    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const data = items.map(item => ({
                deviceId: item.deviceId,
                pointId: item.pointId,
                valueNumeric: item.value,
                measurementTime: item.timestamp || new Date(),
                quality: item.quality,
                rawPayload: item.rawPayload
            }));

            await timescaleDb.insert(telemetryValue).values(data);
            return; // Success - exit
        } catch (err: any) {
            lastError = err;
            console.error(`[TELEMETRY_BATCH] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

            if (attempt < MAX_RETRIES) {
                const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.warn(`[TELEMETRY_BATCH] Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
    }

    // All retries exhausted - throw so caller (flushBuffer) can re-queue
    throw lastError;
};

/**
 * Query historical telemetry data with Drizzle (TimescaleDB)
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
        console.log(`[TELEMETRY] Querying: deviceId=${deviceId}, pointId=${pointId}, hours=${hours}`);
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

        const results = await timescaleDb.select({
            measurementTime: telemetryValue.measurementTime,
            valueNumeric: telemetryValue.valueNumeric,
            deviceId: telemetryValue.deviceId,
            pointId: telemetryValue.pointId
        })
            .from(telemetryValue)
            .where(whereClause)
            .orderBy(asc(telemetryValue.measurementTime))
            .limit(limit);

        console.log(`[TELEMETRY] Query returned ${results.length} rows`);

        return results.map(r => ({
            time: r.measurementTime,
            value: r.valueNumeric,
            deviceId: r.deviceId,
            pointId: r.pointId
        }));
    } catch (err) {
        console.error('[TELEMETRY] Timescale Query Error:', err);
        return [];
    }
};

/**
 * Fast approximate count using pg_stat (TimescaleDB)
 */
export const getApproximateTelemetryCount = async (): Promise<number> => {
    try {
        const result = await timescaleDb.execute(sql`SELECT reltuples::bigint AS count FROM pg_class WHERE relname = 'TelemetryValue'`);
        return Number(result.rows[0]?.count || 0);
    } catch {
        const countResult = await timescaleDb.select({ count: sql<number>`count(*)` }).from(telemetryValue);
        return Number(countResult[0]?.count || 0);
    }
};
