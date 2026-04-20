import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, gte, lt, sql, desc, inArray } from 'drizzle-orm';

export class YtbsAggregatorService {
    
    /**
     * Start the periodical aggregation tasks
     */
    public static start() {
        // Every hour (at minute 5 to ensure all data for previous hour is in)
        setInterval(async () => {
            const now = new Date();
            if (now.getMinutes() === 5) {
                console.log('[YTBS-AGG] Starting Hourly Aggregation...');
                await this.aggregateHourly();
            }
        }, 60 * 1000);

        // Every 15 minutes (at minutes 2, 17, 32, 47)
        setInterval(async () => {
            const now = new Date();
            const mins = now.getMinutes();
            if ([2, 17, 32, 47].includes(mins)) {
                console.log('[YTBS-AGG] Starting 15-min Aggregation...');
                await this.aggregateInstant();
            }
        }, 60 * 1000);
        
        console.log('[YTBS-AGG] Aggregator Service Started.');
    }

    /**
     * Aggregates hourly production (MWh)
     */
    public static async aggregateHourly() {
        try {
            const now = new Date();
            const startTime = new Date(now);
            startTime.setHours(now.getHours() - 1, 0, 0, 0);
            const endTime = new Date(now);
            endTime.setHours(now.getHours(), 0, 0, 0);

            const hourStr = startTime.getHours().toString().padStart(2, '0') + ':00';
            const dateStr = startTime.toISOString().split('T')[0];

            // 1. Find all active YTBS plants
            const ytbsPlants = await db.query.ytbsPlant.findMany({
                where: eq(schema.ytbsPlant.isActive, true)
            });

            for (const yp of ytbsPlants) {
                // 2. Find production points for this plant's devices
                const value = await this.getAveragePowerForPlant(yp.plantId, startTime, endTime);
                
                if (value !== null) {
                    // Convert KW to MWh (Average KW * 1 hour / 1000)
                    const mwhValue = value / 1000;

                    // 3. Insert into queue
                    await db.insert(schema.ytbsHourlyProduction).values({
                        ytbsPlantId: yp.id,
                        readingDate: dateStr,
                        readingHour: hourStr,
                        valueMwh: Number(mwhValue.toFixed(4)),
                        isSent: false
                    }).onConflictDoUpdate({
                        target: [schema.ytbsHourlyProduction.ytbsPlantId, schema.ytbsHourlyProduction.readingDate, schema.ytbsHourlyProduction.readingHour],
                        set: { valueMwh: Number(mwhValue.toFixed(4)), isSent: false, retryCount: 0 }
                    });
                }
            }
        } catch (error) {
            console.error('[YTBS-AGG] Hourly aggregation error:', error);
        }
    }

    /**
     * Aggregates 15-min instant production (MW)
     */
    public static async aggregateInstant() {
        try {
            const now = new Date();
            const endTime = new Date(now);
            endTime.setSeconds(0, 0);
            const startTime = new Date(endTime);
            startTime.setMinutes(endTime.getMinutes() - 15);

            const timeStr = startTime.getHours().toString().padStart(2, '0') + ':' + startTime.getMinutes().toString().padStart(2, '0');
            const dateStr = startTime.toISOString().split('T')[0];

            const ytbsPlants = await db.query.ytbsPlant.findMany({
                where: eq(schema.ytbsPlant.isActive, true)
            });

            for (const yp of ytbsPlants) {
                const value = await this.getAveragePowerForPlant(yp.plantId, startTime, endTime);
                
                if (value !== null) {
                    // Convert KW to MW
                    const mwValue = value / 1000;

                    await db.insert(schema.ytbsInstantProduction).values({
                        ytbsPlantId: yp.id,
                        readingDate: dateStr,
                        readingTime: timeStr,
                        valueMw: Number(mwValue.toFixed(4)),
                        isSent: false
                    }).onConflictDoUpdate({
                        target: [schema.ytbsInstantProduction.ytbsPlantId, schema.ytbsInstantProduction.readingDate, schema.ytbsInstantProduction.readingTime],
                        set: { valueMw: Number(mwValue.toFixed(4)), isSent: false, retryCount: 0 }
                    });
                }
            }
        } catch (error) {
            console.error('[YTBS-AGG] Instant aggregation error:', error);
        }
    }

    /**
     * Helper to get total average power (kW) for a plant across all production points
     */
    private static async getAveragePowerForPlant(plantId: string, start: Date, end: Date): Promise<number | null> {
        // 1. Get all points with MeasurementType = TOTAL_ACTIVE_POWER or ACTIVE_POWER for this plant
        const devices = await db.query.device.findMany({
            where: inArray(
                schema.device.protocolConfigId,
                db.select({ id: schema.protocolConfig.id }).from(schema.protocolConfig).where(eq(schema.protocolConfig.plantId, plantId))
            ),
            with: {
                datasheetProfile: {
                    with: {
                        points: {
                            where: sql`${schema.datasheetPoint.measurementType} IN ('TOTAL_ACTIVE_POWER', 'ACTIVE_POWER')`
                        }
                    }
                }
            }
        });

        const pointIds = devices.flatMap(d => d.datasheetProfile?.points.map(p => p.id) || []);
        if (pointIds.length === 0) return null;

        // 2. Average the values from TelemetryValue for these points
        // We take the sum of averages for each device/point that represents production
        const result = await db.select({
            avgValue: sql<number>`avg("valueNumeric")`
        })
        .from(schema.telemetryValue)
        .where(and(
            inArray(schema.telemetryValue.pointId, pointIds),
            gte(schema.telemetryValue.measurementTime, start),
            lt(schema.telemetryValue.measurementTime, end)
        ));

        const totalAvg = Number(result[0]?.avgValue || 0);
        return totalAvg > 0 ? totalAvg : null;
    }
}

export default YtbsAggregatorService;
