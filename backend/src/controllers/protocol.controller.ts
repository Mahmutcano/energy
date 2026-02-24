import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { ProtocolType } from '@prisma/client';

const modbusConfigSchema = z.object({
    ipAddress: z.string(),
    port: z.number().int(),
    slaveId: z.number().int(),
    timeout: z.number().int().default(1000),
    retryCount: z.number().int().default(3),
});

const iec104ConfigSchema = z.object({
    ipAddress: z.string(),
    port: z.number().int(),
    asduAddr: z.number().int(),
    t0: z.number().int().default(30),
    t1: z.number().int().default(15),
    t2: z.number().int().default(10),
    t3: z.number().int().default(20),
    k: z.number().int().default(12),
    w: z.number().int().default(8),
});

const createProtocolSchema = z.object({
    plantId: z.string(),
    configName: z.string(),
    protocolType: z.nativeEnum(ProtocolType),
    modbusConfig: modbusConfigSchema.optional(),
    iec104Config: iec104ConfigSchema.optional(),
});

export const getProtocols = async (req: Request, res: Response) => {
    try {
        const protocols = await prisma.protocolConfig.findMany({
            include: {
                plant: {
                    select: { id: true, plantName: true }
                },
                modbusConfig: true,
                iec104Config: true,
                _count: {
                    select: { devices: true }
                }
            },
        });
        res.json(protocols);
    } catch (error) {
        console.error('getProtocols error:', error);
        res.status(500).json({ error: 'Failed to fetch protocols' });
    }
};

export const createProtocol = async (req: Request, res: Response) => {
    try {
        const data = createProtocolSchema.parse(req.body);

        let modbusCreate;
        let iecCreate;

        if (data.protocolType === 'MODBUS') {
            if (!data.modbusConfig) throw new Error('Modbus config required for MODBUS type');
            modbusCreate = { create: data.modbusConfig };
        } else if (data.protocolType === 'IEC104') {
            if (!data.iec104Config) throw new Error('IEC104 config required for IEC104 type');
            iecCreate = { create: data.iec104Config };
        }

        const protocol = await prisma.protocolConfig.create({
            data: {
                plant_id: data.plantId,
                configName: data.configName,
                protocolType: data.protocolType,
                modbusConfig: modbusCreate,
                iec104Config: iecCreate,
            },
            include: {
                modbusConfig: true,
                iec104Config: true,
            }
        });

        res.status(201).json(protocol);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        } else {
            console.error('createProtocol error:', error);
            res.status(500).json({ error: 'Failed to create protocol' });
        }
    }
};

export const updateProtocol = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createProtocolSchema.partial().parse(req.body);

        let updateData: any = {};
        if (data.configName) updateData.configName = data.configName;
        if (data.plantId) updateData.plant_id = data.plantId;
        if (data.protocolType) updateData.protocolType = data.protocolType;

        if (data.protocolType === 'MODBUS' && data.modbusConfig) {
            updateData.modbusConfig = {
                upsert: {
                    create: data.modbusConfig,
                    update: data.modbusConfig,
                }
            };
        } else if (data.protocolType === 'IEC104' && data.iec104Config) {
            updateData.iec104Config = {
                upsert: {
                    create: data.iec104Config,
                    update: data.iec104Config,
                }
            };
        }

        const protocol = await prisma.protocolConfig.update({
            where: { id: String(id) },
            data: updateData,
            include: {
                modbusConfig: true,
                iec104Config: true,
            }
        });

        res.json(protocol);
    } catch (error) {
        console.error('updateProtocol error:', error);
        res.status(500).json({ error: 'Failed to update protocol' });
    }
};

export const deleteProtocol = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.modbusConfig.deleteMany({ where: { protocol_id: String(id) } });
        await prisma.iEC104Config.deleteMany({ where: { protocol_id: String(id) } });
        await prisma.protocolConfig.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteProtocol error:', error);
        res.status(500).json({ error: 'Failed to delete protocol' });
    }
};
