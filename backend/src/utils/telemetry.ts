import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Veriyi Veritabanı (PostgreSQL) üzerine kaydeder.
 * Prisma üzerinden standard bir veritabanı kaydı olarak tutulur.
 */
export const saveTelemetry = async (commProtocolId: string, value: number) => {
    try {
        const data: Prisma.TelemetryUncheckedCreateInput = {
            commProtocolId,
            value,
            timestamp: new Date()
        };
        await prisma.telemetry.create({ data });
    } catch (err) {
        console.error('[TELEMETRY] Save Error:', err);
    }
};

/**
 * Geçmiş veriyi sorgular (Grafikler için)
 */
export const queryTelemetry = async (commProtocolId: string, hours: number = 1) => {
    try {
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const results = await prisma.telemetry.findMany({
            where: {
                commProtocolId,
                timestamp: {
                    gte: startTime
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        return results.map(r => ({
            time: r.timestamp,
            value: r.value,
            commProtocolId: r.commProtocolId
        }));
    } catch (err) {
        console.error('[TELEMETRY] Query Error:', err);
        return [];
    }
};
