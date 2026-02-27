
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const PlantTypeValues = ['SOLAR', 'WIND', 'HYDRO'] as const;

const createPlantSchema = z.object({
    companyId: z.string().uuid(),
    plantName: z.string().min(1),
    plantType: z.enum(PlantTypeValues),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
});

export const getPlants = async (req: Request, res: Response) => {
    try {
        const plants = await db.query.plant.findMany({
            with: {
                company: {
                    columns: { id: true, name: true }
                },
                protocols: {
                    columns: { id: true, configName: true, protocolType: true }
                }
            }
        });
        res.json(plants);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createPlant = async (req: Request, res: Response) => {
    try {
        const data = createPlantSchema.parse(req.body);

        const [plant] = await db.insert(schema.plant).values({
            companyId: data.companyId,
            plantName: data.plantName,
            plantType: data.plantType as any,
            latitude: data.latitude ? String(data.latitude) : null,
            longitude: data.longitude ? String(data.longitude) : null,
        }).returning();

        res.status(201).json(plant);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updatePlant = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createPlantSchema.partial().parse(req.body);

        const values: any = {};
        if (data.companyId) values.companyId = data.companyId;
        if (data.plantName) values.plantName = data.plantName;
        if (data.plantType) values.plantType = data.plantType;
        if (data.latitude !== undefined) values.latitude = data.latitude ? String(data.latitude) : null;
        if (data.longitude !== undefined) values.longitude = data.longitude ? String(data.longitude) : null;

        const [plant] = await db.update(schema.plant)
            .set(values)
            .where(eq(schema.plant.id, id))
            .returning();
        res.json(plant);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deletePlant = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const protocolsResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.protocolConfig)
            .where(eq(schema.protocolConfig.plantId, id));

        const protocolsCount = Number(protocolsResult[0]?.count || 0);

        if (protocolsCount > 0) {
            throw new AppError(
                ErrorCode.PLANT_HAS_PROTOCOLS,
                `Bu santrale bağlı ${protocolsCount} protokol bulunuyor. Önce protokolleri silmeniz gerekmektedir. / Plant has ${protocolsCount} protocols.`,
                400
            );
        }

        const userProfilesResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.appUserProfile)
            .where(eq(schema.appUserProfile.plantId, id));

        const userProfilesCount = Number(userProfilesResult[0]?.count || 0);

        if (userProfilesCount > 0) {
            throw new AppError(
                ErrorCode.PLANT_HAS_USERS,
                `Bu santrale bağlı ${userProfilesCount} kullanıcı yetkisi bulunuyor. Önce yetkileri silmeniz gerekmektedir. / Plant has ${userProfilesCount} users.`,
                400
            );
        }

        await db.delete(schema.plant).where(eq(schema.plant.id, id));
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
