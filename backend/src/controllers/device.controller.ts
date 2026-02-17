import { Request, Response } from 'express';
import { DeviceSchema, CommProtocolSchema } from '../utils/validation';
import prisma from '../lib/prisma';

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await prisma.device.findMany({
            include: { category: true, commProtocols: true }
        });
        res.json(devices);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createDevice = async (req: Request, res: Response) => {
    try {
        const validatedData = DeviceSchema.parse(req.body);
        const device = await prisma.device.create({
            data: validatedData
        });

        res.status(201).json(device);
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};

export const createCommProtocol = async (req: Request, res: Response) => {
    try {
        const validatedData = CommProtocolSchema.parse(req.body);
        const protocol = await prisma.commProtocol.create({
            data: validatedData
        });
        res.status(201).json(protocol);
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};
