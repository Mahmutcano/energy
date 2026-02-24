import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { PlantType } from '@prisma/client';

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
        console.error('getPlants error:', error);
        res.status(500).json({ error: 'Failed to fetch plants' });
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
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createPlant error:', error);
            res.status(500).json({ error: 'Failed to create plant' });
        }
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
        console.error('updatePlant error:', error);
        res.status(500).json({ error: 'Failed to update plant' });
    }
};

export const deletePlant = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.plant.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deletePlant error:', error);
        res.status(500).json({ error: 'Failed to delete plant' });
    }
};
