import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import ytbsService from '../services/ytbs.service';

export const getYtbsPlants = async (req: Request, res: Response) => {
    try {
        const plants = await db.query.ytbsPlant.findMany({
            with: { plant: true },
            orderBy: [desc(schema.ytbsPlant.ytbsId)]
        });
        res.json(plants);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createYtbsPlant = async (req: Request, res: Response) => {
    try {
        const { plantId, ytbsId, licenseNo, plantName, capacityAc, isActive } = req.body;
        const [newPlant] = await db.insert(schema.ytbsPlant).values({
            plantId,
            ytbsId: Number(ytbsId),
            licenseNo,
            plantName,
            capacityAc: Number(capacityAc),
            isActive: isActive ?? true
        }).returning();

        res.status(201).json(newPlant);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteYtbsPlant = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await db.delete(schema.ytbsPlant).where(eq(schema.ytbsPlant.id, String(id)));
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getYtbsStats = async (req: Request, res: Response) => {
    try {
        const [
            hourlyUnsent,
            hourlySent,
            hourlyFailed,
            instantUnsent,
            instantSent,
            instantFailed
        ] = await Promise.all([
            db.select({ count: count() }).from(schema.ytbsHourlyProduction).where(eq(schema.ytbsHourlyProduction.isSent, false)),
            db.select({ count: count() }).from(schema.ytbsHourlyProduction).where(eq(schema.ytbsHourlyProduction.isSent, true)),
            db.select({ count: count() }).from(schema.ytbsHourlyProduction).where(and(eq(schema.ytbsHourlyProduction.isSent, false), eq(schema.ytbsHourlyProduction.retryCount, 10))),
            
            db.select({ count: count() }).from(schema.ytbsInstantProduction).where(eq(schema.ytbsInstantProduction.isSent, false)),
            db.select({ count: count() }).from(schema.ytbsInstantProduction).where(eq(schema.ytbsInstantProduction.isSent, true)),
            db.select({ count: count() }).from(schema.ytbsInstantProduction).where(and(eq(schema.ytbsInstantProduction.isSent, false), eq(schema.ytbsInstantProduction.retryCount, 10)))
        ]);

        res.json({
            hourly: {
                unsent: hourlyUnsent[0].count,
                sent: hourlySent[0].count,
                failed: hourlyFailed[0].count
            },
            instant: {
                unsent: instantUnsent[0].count,
                sent: instantSent[0].count,
                failed: instantFailed[0].count
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const triggerYtbsSync = async (req: Request, res: Response) => {
    try {
        // Run background task
        ytbsService.triggerSync();
        res.json({ success: true, message: 'Senkronizasyon tetiklendi.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
