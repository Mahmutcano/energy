
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import { IEC104Service } from '../services/iec104.service';
import ModbusService from '../services/modbus.service';

const DeviceTypeValues = ['INVERTER', 'ANALYZER', 'RELAY'] as const;

const createDeviceSchema = z.object({
    protocolConfigId: z.string().uuid("Invalid Protocol Config ID"),
    deviceName: z.string().min(1, "Device name is required"),
    deviceType: z.enum(DeviceTypeValues),
    isActive: z.boolean().optional(),
    createdAt: z.string().datetime().optional().nullable(),
    datasheetProfileId: z.string().uuid("Datasheet Selection is required"),
});

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await db.query.device.findMany({
            with: {
                protocol: {
                    columns: {
                        id: true,
                        configName: true,
                        protocolType: true
                    },
                    with: {
                        plant: {
                            columns: { id: true, plantName: true }
                        }
                    }
                },
                datasheetProfile: {
                    columns: { id: true, name: true, protocolType: true }
                }
            }
        });
        res.json(devices);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createDevice = async (req: Request, res: Response) => {
    try {
        const data = createDeviceSchema.parse(req.body);

        const [device] = await db.insert(schema.device).values({
            protocolConfigId: data.protocolConfigId,
            deviceName: data.deviceName,
            deviceType: data.deviceType as any,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            datasheetProfileId: data.datasheetProfileId || null,
        }).returning();

        try {
            await ModbusService.reloadConfigs();
        } catch (err) { }

        res.status(201).json(device);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateDevice = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDeviceSchema.partial().parse(req.body);

        const values: any = {};
        if (data.protocolConfigId !== undefined) values.protocolConfigId = data.protocolConfigId;
        if (data.deviceName !== undefined) values.deviceName = data.deviceName;
        if (data.deviceType !== undefined) values.deviceType = data.deviceType;
        if (data.isActive !== undefined) values.isActive = data.isActive;
        if (data.createdAt !== undefined) values.createdAt = data.createdAt ? new Date(data.createdAt) : undefined;
        if (data.datasheetProfileId !== undefined) values.datasheetProfileId = data.datasheetProfileId;

        const [device] = await db.update(schema.device)
            .set(values)
            .where(eq(schema.device.id, id))
            .returning();
        try {
            await ModbusService.reloadConfigs();
        } catch (err) { }

        res.json(device);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteDevice = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        // 1. Delete associated telemetry records first to allow deletion
        await db.delete(schema.telemetryValue).where(eq(schema.telemetryValue.deviceId, id));

        // 2. Delete the device
        await db.delete(schema.device).where(eq(schema.device.id, id));

        try {
            await ModbusService.reloadConfigs();
            await IEC104Service.getInstance().reloadConfigs();
        } catch (err) { }

        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
