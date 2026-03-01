import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import { IEC104Service } from '../services/iec104.service';
import ModbusService from '../services/modbus.service';

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

const ProtocolTypeEnum = z.enum(['MODBUS', 'IEC104']);

const createProtocolSchema = z.object({
    plantId: z.string().uuid(),
    configName: z.string().min(1),
    protocolType: ProtocolTypeEnum,
    modbusConfig: modbusConfigSchema.optional(),
    iec104Config: iec104ConfigSchema.optional(),
});

export const getProtocols = async (req: Request, res: Response) => {
    try {
        const protocols = await db.query.protocolConfig.findMany({
            with: {
                plant: {
                    columns: { id: true, plantName: true }
                },
                modbusConfig: true,
                iec104Config: true,
                devices: {
                    columns: { id: true }
                }
            },
        });

        const result = protocols.map(p => ({
            ...p,
            _count: { devices: p.devices.length }
        }));

        res.json(result);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createProtocol = async (req: Request, res: Response) => {
    try {
        const data = createProtocolSchema.parse(req.body);

        const result = await db.transaction(async (tx) => {
            const [protocol] = await tx.insert(schema.protocolConfig).values({
                plantId: data.plantId,
                configName: data.configName,
                protocolType: data.protocolType as any,
                isActive: true
            }).returning();

            let modbusConfigResult = null;
            let iec104ConfigResult = null;

            if (data.protocolType === 'MODBUS') {
                if (!data.modbusConfig) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Modbus config required for MODBUS type', 400);
                const [modbus] = await tx.insert(schema.modbusConfig).values({
                    ...data.modbusConfig,
                    protocolId: protocol.id
                }).returning();
                modbusConfigResult = modbus;
            } else if (data.protocolType === 'IEC104') {
                if (!data.iec104Config) throw new AppError(ErrorCode.VALIDATION_FAILED, 'IEC104 config required for IEC104 type', 400);
                const [iec] = await tx.insert(schema.iec104Config).values({
                    ...data.iec104Config,
                    protocolId: protocol.id
                }).returning();
                iec104ConfigResult = iec;
            }

            return { ...protocol, modbusConfig: modbusConfigResult, iec104Config: iec104ConfigResult };
        });

        // Trigger recharge for new protocols
        IEC104Service.getInstance().reloadConfigs().catch(e => console.error(e));
        ModbusService.reloadConfigs().catch(e => console.error(e));

        res.status(201).json(result);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateProtocol = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createProtocolSchema.partial().parse(req.body);

        const result = await db.transaction(async (tx) => {
            const updateValues: any = {};
            if (data.configName) updateValues.configName = data.configName;
            if (data.plantId) updateValues.plantId = data.plantId;
            if (data.protocolType) updateValues.protocolType = data.protocolType;

            const [protocol] = await tx.update(schema.protocolConfig)
                .set(updateValues)
                .where(eq(schema.protocolConfig.id, id))
                .returning();

            if (!protocol) throw new AppError(ErrorCode.PROTOCOL_NOT_FOUND, 'Protocol not found', 404);

            let modbusConfigResult = null;
            let iec104ConfigResult = null;

            if (data.protocolType === 'MODBUS' && data.modbusConfig) {
                const [modbus] = await tx.insert(schema.modbusConfig)
                    .values({ ...data.modbusConfig, protocolId: id })
                    .onConflictDoUpdate({
                        target: schema.modbusConfig.protocolId,
                        set: data.modbusConfig
                    })
                    .returning();
                modbusConfigResult = modbus;
            } else if (data.protocolType === 'IEC104' && data.iec104Config) {
                const [iec] = await tx.insert(schema.iec104Config)
                    .values({ ...data.iec104Config, protocolId: id })
                    .onConflictDoUpdate({
                        target: schema.iec104Config.protocolId,
                        set: data.iec104Config
                    })
                    .returning();
                iec104ConfigResult = iec;
            }

            return { ...protocol, modbusConfig: modbusConfigResult, iec104Config: iec104ConfigResult };
        });

        // Trigger recharge for updated protocols
        IEC104Service.getInstance().reloadConfigs().catch(e => console.error(e));
        ModbusService.reloadConfigs().catch(e => console.error(e));

        res.json(result);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteProtocol = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const devicesResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.device)
            .where(eq(schema.device.protocolConfigId, id));

        const devicesCount = Number(devicesResult[0]?.count || 0);

        if (devicesCount > 0) {
            throw new AppError(
                ErrorCode.PROTOCOL_HAS_DEVICES,
                `Bu protokole bağlı ${devicesCount} cihaz bulunuyor. Önce cihazları silmelisiniz. / Protocol has ${devicesCount} devices connected.`,
                400
            );
        }

        await db.transaction(async (tx) => {
            await tx.delete(schema.modbusConfig).where(eq(schema.modbusConfig.protocolId, id));
            await tx.delete(schema.iec104Config).where(eq(schema.iec104Config.protocolId, id));
            await tx.delete(schema.protocolConfig).where(eq(schema.protocolConfig.id, id));
        });

        // Stop the background service for this protocol
        IEC104Service.getInstance().reloadConfigs().catch(e => console.error(e));
        ModbusService.reloadConfigs().catch(e => console.error(e));

        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
