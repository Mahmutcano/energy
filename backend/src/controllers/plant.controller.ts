import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const createPlantSchema = z.object({
    companyId: z.string(),
    plantName: z.string().min(1),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
});

export const getPlants = async (req: Request, res: Response) => {
    try {
        const plants = await prisma.plant.findMany({
            include: {
                company: true,
                commProtocols: true,
            },
            orderBy: { createdAt: 'desc' }
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
                companyId: data.companyId,
                plantName: data.plantName,
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
        const plant = await prisma.plant.update({
            where: { id: String(id) },
            data: {
                ...data,
                // Handle optional nulls if needed, partial schema handles optional fields
            }
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
