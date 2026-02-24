import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { DeviceType } from '@prisma/client';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const createDeviceSchema = z.object({
    protocolConfigId: z.string().uuid("Invalid Protocol Config ID"),
    deviceName: z.string().min(1, "Device name is required"),
    deviceType: z.nativeEnum(DeviceType),
    isActive: z.boolean().optional(),
    createdAt: z.string().datetime().optional().nullable(),
    datasheetProfileId: z.string().uuid("Invalid Profile ID").optional().nullable(),
});

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await prisma.device.findMany({
            include: {
                protocol: {
                    select: {
                        id: true,
                        configName: true,
                        protocolType: true,
                        plant: {
                            select: { id: true, plantName: true }
                        }
                    }
                },
                datasheetProfile: {
                    select: { id: true, name: true, protocolType: true }
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

        const createData: any = {
            protocol_config_id: data.protocolConfigId,
            deviceName: data.deviceName,
            deviceType: data.deviceType,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
            datasheet_profile_id: data.datasheetProfileId || undefined,
        };

        const device = await prisma.device.create({
            data: createData
        });

        res.status(201).json(device);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDeviceSchema.partial().parse(req.body);

        const updateData: any = {};
        if (data.protocolConfigId !== undefined) updateData.protocol_config_id = data.protocolConfigId;
        if (data.deviceName !== undefined) updateData.deviceName = data.deviceName;
        if (data.deviceType !== undefined) updateData.deviceType = data.deviceType;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.createdAt !== undefined) updateData.createdAt = data.createdAt ? new Date(data.createdAt) : undefined;
        if (data.datasheetProfileId !== undefined) updateData.datasheet_profile_id = data.datasheetProfileId;

        const device = await prisma.device.update({
            where: { id: String(id) },
            data: updateData
        });
        res.json(device);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteDevice = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const telemetryCount = await prisma.telemetryValue.count({
            where: { device_id: String(id) }
        });

        if (telemetryCount > 0) {
            throw new AppError(
                ErrorCode.DEVICE_HAS_TELEMETRY,
                `Bu cihaza ait ${telemetryCount} telemetri kaydı bulunuyor. Önce verileri silmelisiniz. / Device has ${telemetryCount} telemetry records.`,
                400
            );
        }

        await prisma.device.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
