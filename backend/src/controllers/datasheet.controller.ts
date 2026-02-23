import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const createProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    protocolType: z.enum(["MODBUS", "IEC104"])
});

export const getDatasheetProfiles = async (req: Request, res: Response) => {
    try {
        const profiles = await prisma.datasheetProfile.findMany({
            include: {
                _count: {
                    select: { points: true, devices: true }
                }
            }
        });
        res.json(profiles);
    } catch (error) {
        console.error('getDatasheetProfiles error:', error);
        res.status(500).json({ error: 'Failed to fetch datasheet profiles' });
    }
};

export const createDatasheetProfile = async (req: Request, res: Response) => {
    try {
        const data = createProfileSchema.parse(req.body);
        const profile = await prisma.datasheetProfile.create({ data });
        res.status(201).json(profile);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createDatasheetProfile error:', error);
            res.status(500).json({ error: 'Failed to create profile' });
        }
    }
};

export const updateDatasheetProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createProfileSchema.partial().parse(req.body);
        const profile = await prisma.datasheetProfile.update({
            where: { id: String(id) },
            data
        });
        res.json(profile);
    } catch (error) {
        console.error('updateDatasheetProfile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

export const deleteDatasheetProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.datasheetProfile.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDatasheetProfile error:', error);
        res.status(500).json({ error: 'Failed to delete profile. Please ensure no devices are linked.' });
    }
};

const createDataPointSchema = z.object({
    profile_id: z.string().uuid("Invalid Profile ID"),
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

export const getDatasheetPoints = async (req: Request, res: Response) => {
    try {
        const { profileId } = req.query;
        let whereClause = {};
        if (profileId) {
            whereClause = { profile_id: String(profileId) };
        }

        const points = await prisma.datasheetPoint.findMany({
            where: whereClause
        });
        res.json(points);
    } catch (error) {
        console.error('getDatasheetPoints error:', error);
        res.status(500).json({ error: 'Failed to fetch data points' });
    }
};

export const createDatasheetPoint = async (req: Request, res: Response) => {
    try {
        const data = createDataPointSchema.parse(req.body);

        const point = await prisma.datasheetPoint.create({
            data
        });

        res.status(201).json(point);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createDatasheetPoint error:', error);
            res.status(500).json({ error: 'Failed to create point' });
        }
    }
};

export const updateDatasheetPoint = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDataPointSchema.partial().parse(req.body);

        const point = await prisma.datasheetPoint.update({
            where: { id: String(id) },
            data
        });
        res.json(point);
    } catch (error) {
        console.error('updateDatasheetPoint error:', error);
        res.status(500).json({ error: 'Failed to update point' });
    }
};

export const deleteDatasheetPoint = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.datasheetPoint.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteDatasheetPoint error:', error);
        res.status(500).json({ error: 'Failed to delete data point' });
    }
};
