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

export const queryExternalPlants = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.body;
        if (!companyId) return res.status(400).json({ success: false, message: 'Firma seçilmelidir.' });

        const rawResponse = await ytbsService.listLisanssizSantral(companyId);
        
        // Normalize the data for frontend table
        // TEİAŞ returns { success: true, data: { veri: [...] } }
        let rawList = [];
        if (rawResponse && rawResponse.data && Array.isArray(rawResponse.data.veri)) {
            rawList = rawResponse.data.veri;
        } else if (rawResponse && Array.isArray(rawResponse.veri)) {
            rawList = rawResponse.veri;
        }

        const normalizedPlants = rawList.map((p: any) => ({
            lisanssizSantral: {
                id: p.id,
                ad: p.ad,
                durum: p.durum,
                il: p.il
            },
            isletmedekiGuc: p.tarihce ? p.tarihce.acGucu : (p.isletmedekiGuc || 0),
            kuruluGuc: p.tarihce ? p.tarihce.dcGucu : (p.kuruluGuc || 0),
            status: p.durum ? p.durum.ad : 'Bilinmiyor',
            city: p.il ? p.il.ad : ''
        }));

        res.json({ success: true, data: normalizedPlants });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const importExternalPlants = async (req: Request, res: Response) => {
    try {
        const { companyId, plants } = req.body;
        if (!companyId) return res.status(400).json({ success: false, message: 'Firma seçilmelidir.' });
        if (!Array.isArray(plants)) return res.status(400).json({ success: false, message: 'Santral listesi gereklidir.' });

        const company = await db.query.companyProfile.findFirst({
            where: eq(schema.companyProfile.id, companyId)
        });

        const imported: any[] = [];
        for (const p of plants) {
            // Check if already exists in Plant table
            let plantId: string;
            const existingPlant = await db.query.plant.findFirst({
                where: and(
                    eq(schema.plant.companyId, companyId),
                    eq(schema.plant.ytbsExternalId, p.lisanssizSantral.id)
                )
            });

            if (existingPlant) {
                plantId = existingPlant.id;
            } else {
                const [newPlant] = await db.insert(schema.plant).values({
                    companyId,
                    plantName: p.lisanssizSantral.ad,
                    plantType: 'SOLAR',
                    ytbsExternalId: p.lisanssizSantral.id,
                    ytbsPlantName: p.lisanssizSantral.ad,
                    canSendYtbs: true,
                    isActive: true
                }).returning();
                plantId = newPlant.id;
            }

            // Check/Create entry in YtbsPlant table for sync mapping
            const existingYtbsMapping = await db.query.ytbsPlant.findFirst({
                where: eq(schema.ytbsPlant.ytbsId, p.lisanssizSantral.id)
            });

            if (!existingYtbsMapping) {
                await db.insert(schema.ytbsPlant).values({
                    plantId,
                    ytbsId: p.lisanssizSantral.id,
                    plantName: p.lisanssizSantral.ad,
                    licenseNo: company?.baglantiAnlasmasiSirketiLisansNo || 'DUMMY-LICENSE',
                    capacityAc: p.isletmedekiGuc || 0,
                    isActive: true
                });
            }

            imported.push({ id: plantId, name: p.lisanssizSantral.ad });
        }
        res.json({ success: true, importedCount: imported.length, data: imported });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removeExternalPlant = async (req: Request, res: Response) => {
    try {
        const { companyId, ytbsId } = req.body;
        if (!companyId || !ytbsId) return res.status(400).json({ success: false, message: 'Firma ID ve YTBS ID gereklidir.' });

        // Find the plant first
        const existingPlant = await db.query.plant.findFirst({
            where: and(
                eq(schema.plant.companyId, companyId),
                eq(schema.plant.ytbsExternalId, Number(ytbsId))
            )
        });

        if (!existingPlant) {
            return res.status(404).json({ success: false, message: 'Santral bulunamadı.' });
        }

        // Delete plant (cascade will handle YtbsPlant if defined, but we'll be safe)
        await db.delete(schema.ytbsPlant).where(eq(schema.ytbsPlant.plantId, existingPlant.id));
        await db.delete(schema.plant).where(eq(schema.plant.id, existingPlant.id));

        res.json({ success: true, message: 'Santral başarıyla sistemden kaldırıldı.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProductionLogs = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        if (type === 'hourly') {
            const logs = await db.query.ytbsHourlyProduction.findMany({
                with: { ytbsPlant: true },
                orderBy: [desc(schema.ytbsHourlyProduction.createdAt)],
                limit: 100
            });
            return res.json(logs);
        } else {
            const logs = await db.query.ytbsInstantProduction.findMany({
                with: { ytbsPlant: true },
                orderBy: [desc(schema.ytbsInstantProduction.createdAt)],
                limit: 100
            });
            return res.json(logs);
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteProductionLog = async (req: Request, res: Response) => {
    try {
        const { id, type } = req.params;
        if (type === 'hourly') {
            await db.delete(schema.ytbsHourlyProduction).where(eq(schema.ytbsHourlyProduction.id, id as string));
        } else {
            await db.delete(schema.ytbsInstantProduction).where(eq(schema.ytbsInstantProduction.id, id as string));
        }
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getImportedIds = async (req: Request, res: Response) => {
    try {
        const plants = await db.select({ ytbsId: schema.ytbsPlant.ytbsId }).from(schema.ytbsPlant);
        const ids = plants.map(p => p.ytbsId);
        return res.json({ success: true, data: ids });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
