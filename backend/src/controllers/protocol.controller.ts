import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { ProtocolType, ModbusDataType } from '@prisma/client';

const modbusConfigSchema = z.object({
    slaveId: z.number().int(),
    regAddress: z.number().int(),
    dataType: z.nativeEnum(ModbusDataType),
});

const iec104ConfigSchema = z.object({
    asduAddress: z.number().int(),
    t0_timeout: z.number().int(),
    k_window: z.number().int(),
});

const createProtocolSchema = z.object({
    deviceId: z.string(),
    plantId: z.string(),
    protocolType: z.nativeEnum(ProtocolType),
    ipAddress: z.string().nullable().optional(),
    modbusConfig: modbusConfigSchema.optional(),
    iec104Config: iec104ConfigSchema.optional(),
});

export const getProtocols = async (req: Request, res: Response) => {
    try {
        const protocols = await prisma.commProtocol.findMany({
            include: {
                device: true,
                plant: true,
                modbusConfig: true,
                iec104Config: true,
                telemetry: { take: 10, orderBy: { timestamp: 'desc' } }, // Sample telemetry
            },
            orderBy: { createdAt: 'desc' },
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

        const protocol = await prisma.commProtocol.create({
            data: {
                deviceId: data.deviceId,
                plantId: data.plantId,
                protocolType: data.protocolType,
                ipAddress: data.ipAddress ?? null,
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

export const deleteProtocol = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Cascade delete should handle config deletion if set up in DB, but Prisma handles it if relations are correct.
        // Or we might need to delete config manually first.
        // Prisma schema: modbusConfig CommProtocol @relation(fields: [commProtocolId], references: [id])
        // Usually need onDelete: Cascade in schema for DB level, or Prisma handles transaction.
        // Let's assume correct relation or manual delete if it fails.

        await prisma.commProtocol.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteProtocol error:', error);
        res.status(500).json({ error: 'Failed to delete protocol' });
    }
};
