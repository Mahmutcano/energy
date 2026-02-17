import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const createDeviceSchema = z.object({
    categoryId: z.string().uuid("Invalid Category ID"),
    deviceName: z.string().min(1, "Device name is required"),
    isActive: z.boolean().optional(),
});

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await prisma.device.findMany({
            include: {
                category: true,
                commProtocols: {
                    include: { plant: true } // Include plant info from protocols
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(devices);
    } catch (error) {
        console.error('getDevices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
};

export const createDevice = async (req: Request, res: Response) => {
    try {
        const data = createDeviceSchema.parse(req.body);

        const device = await prisma.device.create({
            data: {
                categoryId: data.categoryId,
                deviceName: data.deviceName,
                isActive: data.isActive ?? true,
            }
        });

        res.status(201).json(device);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createDevice error:', error);
            res.status(500).json({ error: 'Failed to create device' });
        }
    }
};

export const deleteDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.device.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDevice error:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
};
