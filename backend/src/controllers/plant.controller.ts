import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { PlantType } from '@prisma/client';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const createPlantSchema = z.object({
    companyId: z.string(),
    plantName: z.string().min(1),
    plantType: z.nativeEnum(PlantType),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
});

export const getPlants = async (req: Request, res: Response) => {
    try {
        const plants = await prisma.plant.findMany({
            include: {
                company: {
                    select: { id: true, name: true }
                },
                protocols: {
                    select: { id: true, configName: true, protocolType: true }
                },
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

        const plant = await prisma.plant.create({
            data: {
                company_id: data.companyId,
                plantName: data.plantName,
                plantType: data.plantType,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
            }
        });

        res.status(201).json(plant);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updatePlant = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createPlantSchema.partial().parse(req.body);

        let updateData: any = { ...data };
        if (data.companyId) {
            updateData.company_id = data.companyId;
            delete updateData.companyId;
        }

        const plant = await prisma.plant.update({
            where: { id: String(id) },
            data: updateData
        });
        res.json(plant);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deletePlant = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const protocolsCount = await prisma.protocolConfig.count({
            where: { plant_id: String(id) }
        });
        if (protocolsCount > 0) {
            throw new AppError(
                ErrorCode.PLANT_HAS_PROTOCOLS,
                `Bu santrale bağlı ${protocolsCount} protokol bulunuyor. Önce protokolleri silmeniz gerekmektedir. / Plant has ${protocolsCount} protocols.`,
                400
            );
        }

        const userProfilesCount = await prisma.appUserProfile.count({
            where: { plant_id: String(id) }
        });
        if (userProfilesCount > 0) {
            throw new AppError(
                ErrorCode.PLANT_HAS_USERS,
                `Bu santrale bağlı ${userProfilesCount} kullanıcı yetkisi bulunuyor. Önce yetkileri silmeniz gerekmektedir. / Plant has ${userProfilesCount} users.`,
                400
            );
        }

        await prisma.plant.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
