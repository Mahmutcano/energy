import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { DeviceType } from '@prisma/client';

const createDeviceSchema = z.object({
    protocolConfigId: z.string().uuid("Invalid Protocol Config ID"),
    deviceName: z.string().min(1, "Device name is required"),
    deviceType: z.nativeEnum(DeviceType),
    isActive: z.boolean().optional(),
});

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await prisma.device.findMany({
            include: {
                protocol: {
                    include: { plant: true } // Include plant info from protocols
                }
            }
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
                protocol_config_id: data.protocolConfigId,
                deviceName: data.deviceName,
                deviceType: data.deviceType,
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
