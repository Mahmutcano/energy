import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const createDataSheetSchema = z.object({
    device_id: z.string().uuid("Invalid Device ID"),
    dataName: z.string().min(1, "Data name is required"),
    dataValue: z.string().optional().nullable(),
    registerAddress: z.number().int().optional().nullable(),
    isActive: z.boolean().optional(),

    // Modbus Fields
    functionCode: z.number().int().optional().nullable(),
    multiplier: z.number().optional().nullable(),
    wordSwap: z.boolean().optional().nullable(),

    // IEC104 Fields
    feederName: z.string().optional().nullable(),
    signalType: z.string().optional().nullable(),
    signalDescription: z.string().optional().nullable(),
    dataType: z.string().optional().nullable(),
    signalSource: z.string().optional().nullable(),
    componentId: z.string().optional().nullable(),
    componentText: z.string().optional().nullable(),
    ioa1ObjectAddress: z.number().int().optional().nullable(),
    ioa2CellNo: z.number().int().optional().nullable(),
    ioa3VoltageLevel: z.number().int().optional().nullable(),
    scadaAddress: z.number().int().optional().nullable(),
});

export const getDataSheets = async (req: Request, res: Response) => {
    try {
        const { deviceId } = req.query;
        let whereClause = {};
        if (deviceId) {
            whereClause = { device_id: String(deviceId) };
        }

        const dataSheets = await prisma.deviceDataSheet.findMany({
            where: whereClause,
            include: {
                device: {
                    include: {
                        protocol: true
                    }
                }
            }
        });
        res.json(dataSheets);
    } catch (error) {
        console.error('getDataSheets error:', error);
        res.status(500).json({ error: 'Failed to fetch data sheets' });
    }
};

export const createDataSheet = async (req: Request, res: Response) => {
    try {
        const data = createDataSheetSchema.parse(req.body);

        const dataSheet = await prisma.deviceDataSheet.create({
            data
        });

        res.status(201).json(dataSheet);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createDataSheet error:', error);
            res.status(500).json({ error: 'Failed to create data sheet' });
        }
    }
};

export const updateDataSheet = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDataSheetSchema.partial().parse(req.body);

        const dataSheet = await prisma.deviceDataSheet.update({
            where: { id: String(id) },
            data
        });
        res.json(dataSheet);
    } catch (error) {
        console.error('updateDataSheet error:', error);
        res.status(500).json({ error: 'Failed to update data sheet' });
    }
};

export const deleteDataSheet = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.deviceDataSheet.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDataSheet error:', error);
        res.status(500).json({ error: 'Failed to delete data sheet' });
    }
};
