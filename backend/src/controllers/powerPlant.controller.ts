import { Request, Response } from 'express';
import { PowerPlantSchema } from '../utils/validation';

// Mocking Prisma for the demo
const prismaMock = {
    powerPlant: {
        findMany: async (args: any) => [
            { id: 'pp-001', name: 'Güneş Santrali - A', customerId: args?.where?.customerId || 'cust-1' },
            { id: 'pp-002', name: 'Rüzgar Santrali - B', customerId: args?.where?.customerId || 'cust-1' }
        ],
        create: async (data: any) => ({ id: Math.random().toString(), ...data.data })
    }
};

export const getPowerPlants = async (req: Request, res: Response) => {
    try {
        const { customerId } = req.query;
        const plants = await prismaMock.powerPlant.findMany({
            where: customerId ? { customerId: String(customerId) } : {}
        });
        res.json(plants);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createPowerPlant = async (req: Request, res: Response) => {
    try {
        const validatedData = PowerPlantSchema.parse(req.body);
        const plant = await prismaMock.powerPlant.create({
            data: validatedData
        });
        res.status(201).json(plant);
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};
