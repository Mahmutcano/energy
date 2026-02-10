import prisma from '../lib/prisma';

/**
 * Veriyi TimescaleDB (PostgreSQL) üzerine kaydeder.
 * Prisma üzerinden standard bir veritabanı kaydı olarak tutulur.
 */
export const saveTelemetry = async (deviceId: string, ioa: number, value: number) => {
    try {
        await prisma.telemetry.create({
            data: {
                deviceId,
                address: ioa,
                value: value,
                timestamp: new Date()
            }
        });
    } catch (err) {
        console.error('[TELEMETRY] Save Error:', err);
    }
};

/**
 * Geçmiş veriyi sorgular (Grafikler için)
 */
export const queryTelemetry = async (deviceId: string, ioa: number, hours: number = 1) => {
    try {
        const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

        const results = await prisma.telemetry.findMany({
            where: {
                deviceId,
                address: ioa,
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
            deviceId: r.deviceId,
            ioa: r.address
        }));
    } catch (err) {
        console.error('[TELEMETRY] Query Error:', err);
        return [];
    }
};
