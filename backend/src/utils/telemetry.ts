import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Veriyi Veritabanı (PostgreSQL) üzerine kaydeder.
 * Prisma üzerinden standard bir veritabanı kaydı olarak tutulur.
 * Batch (toplu) kayıt desteği eklenmiştir.
 */
export const saveTelemetry = async (deviceId: string, pointId: string, value: number, timestamp?: Date, quality?: number, rawPayload?: Buffer) => {
    try {
        const data: Prisma.TelemetryValueUncheckedCreateInput = {
            device_id: deviceId,
            pointId: pointId,
            valueNumeric: value,
            measurementTime: timestamp || new Date(),
            quality: quality,
            rawPayload: rawPayload as any
        };
        await prisma.telemetryValue.create({ data });
    } catch (err) {
        console.error('[TELEMETRY] Save Error:', err);
    }
};

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
            skipDuplicates: false // We want all historical data
        });
    } catch (err) {
        console.error('[TELEMETRY_BATCH] Save Error:', err);
    }
};

/**
 * Geçmiş veriyi sorgular (Grafikler için)
 */
export const queryTelemetry = async (deviceId: string, pointId: string, hours?: number, startDate?: Date, endDate?: Date) => {
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
