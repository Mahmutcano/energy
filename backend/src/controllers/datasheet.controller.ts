
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, sql, asc, getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import { IEC104Service } from '../services/iec104.service';

// ============================================================
// Profile Schemas & Controllers
// ============================================================

const createProfileSchema = z.object({
    name: z.string().min(1, "Profil adı zorunludur"),
    protocolType: z.enum(["MODBUS", "IEC104"], {
        message: "Protokol tipi MODBUS veya IEC104 olmalıdır"
    })
});

export const getDatasheetProfiles = async (req: Request, res: Response) => {
    try {
        // Get profiles with points and devices count
        const profileList = await db.select({
            ...getTableColumns(schema.datasheetProfile),
            pointsCount: sql<number>`(SELECT count(*) FROM "DatasheetPoint" WHERE "profile_id" = ${schema.datasheetProfile.id})`.mapWith(Number),
            devicesCount: sql<number>`(SELECT count(*) FROM "Device" WHERE "datasheet_profile_id" = ${schema.datasheetProfile.id})`.mapWith(Number)
        }).from(schema.datasheetProfile);

        // Map it to look like Prisma's output if frontend expects it
        const result = profileList.map(p => ({
            ...p,
            _count: {
                points: p.pointsCount,
                devices: p.devicesCount
            }
        }));

        res.json(result);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createDatasheetProfile = async (req: Request, res: Response) => {
    try {
        const data = createProfileSchema.parse(req.body);

        const existing = await db.query.datasheetProfile.findFirst({
            where: eq(schema.datasheetProfile.name, data.name)
        });

        if (existing) {
            throw new AppError(
                ErrorCode.VALIDATION_FAILED,
                `"${data.name}" adında bir profil zaten mevcut / Profile already exists`,
                409
            );
        }

        const [profile] = await db.insert(schema.datasheetProfile).values({
            name: data.name,
            protocolType: data.protocolType as any
        }).returning();

        res.status(201).json(profile);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateDatasheetProfile = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createProfileSchema.partial().parse(req.body);
        const [profile] = await db.update(schema.datasheetProfile)
            .set(data as any)
            .where(eq(schema.datasheetProfile.id, id))
            .returning();
        res.json(profile);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteDatasheetProfile = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(schema.device)
            .where(eq(schema.device.datasheetProfileId, id));

        const linkedDevices = Number(result[0]?.count || 0);

        if (linkedDevices > 0) {
            throw new AppError(
                ErrorCode.DATASHEET_HAS_DEVICES,
                `Bu profile ${linkedDevices} cihaz bağlı. Önce cihazların profil bağlantısını kaldırın. / Profile is linked to ${linkedDevices} devices.`,
                400
            );
        }

        await db.delete(schema.datasheetProfile).where(eq(schema.datasheetProfile.id, id));
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

// ============================================================
// DatasheetPoint Schemas & Controllers
// ============================================================

const createDataPointSchema = z.object({
    profileId: z.string().uuid("Geçersiz Profil ID"),
    dataName: z.string().min(1, "Data adı zorunludur"),
    dataValue: z.string().optional().nullable(),
    registerAddress: z.number().int().min(0).optional().nullable(),
    isActive: z.boolean().optional().default(true),
    functionCode: z.number().int().min(1).max(4).optional().nullable(),
    multiplier: z.number().optional().nullable(),
    wordSwap: z.boolean().optional().nullable(),
    feederName: z.string().max(100).optional().nullable(),
    signalType: z.string().max(100).optional().nullable(),
    signalDescription: z.string().max(250).optional().nullable(),
    dataType: z.string().max(50).optional().nullable(),
    signalSource: z.string().max(100).optional().nullable(),
    componentId: z.string().max(100).optional().nullable(),
    componentText: z.string().max(250).optional().nullable(),
    ioa1ObjectAddress: z.coerce.number().int().min(0).optional().nullable(),
    ioa2CellNo: z.coerce.number().int().min(0).optional().nullable(),
    ioa3VoltageLevel: z.coerce.number().int().min(0).optional().nullable(),
    scadaAddress: z.coerce.number().int().min(0).optional().nullable(),
});

export const getDatasheetPoints = async (req: Request, res: Response) => {
    try {
        const { profileId } = req.query;
        let whereClause;
        if (profileId) {
            whereClause = eq(schema.datasheetPoint.profileId, String(profileId));
        }

        const points = await db.query.datasheetPoint.findMany({
            where: whereClause,
            orderBy: [
                asc(schema.datasheetPoint.ioa1ObjectAddress),
                asc(schema.datasheetPoint.registerAddress),
                asc(schema.datasheetPoint.dataName)
            ]
        });
        res.json(points);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createDatasheetPoint = async (req: Request, res: Response) => {
    try {
        const data = createDataPointSchema.parse(req.body);

        const profile = await db.query.datasheetProfile.findFirst({
            where: eq(schema.datasheetProfile.id, data.profileId)
        });
        if (!profile) {
            throw new AppError(ErrorCode.DATASHEET_NOT_FOUND, 'Profil bulunamadı / Profile not found', 404);
        }

        const existingPoint = await db.query.datasheetPoint.findFirst({
            where: and(
                eq(schema.datasheetPoint.profileId, data.profileId),
                eq(schema.datasheetPoint.dataName, data.dataName)
            )
        });
        if (existingPoint) {
            throw new AppError(
                ErrorCode.VALIDATION_FAILED,
                `"${data.dataName}" adında bir veri noktası bu profilde zaten mevcut / Data point name already exists in profile`,
                409
            );
        }

        const [point] = await db.insert(schema.datasheetPoint).values({
            profileId: data.profileId,
            dataName: data.dataName,
            dataValue: data.dataValue,
            registerAddress: data.registerAddress,
            isActive: data.isActive,
            functionCode: data.functionCode,
            multiplier: data.multiplier,
            wordSwap: data.wordSwap,
            feederName: data.feederName,
            signalType: data.signalType,
            signalDescription: data.signalDescription,
            dataType: data.dataType,
            signalSource: data.signalSource,
            componentId: data.componentId,
            componentText: data.componentText,
            ioa1ObjectAddress: data.ioa1ObjectAddress,
            ioa2CellNo: data.ioa2CellNo,
            ioa3VoltageLevel: data.ioa3VoltageLevel,
            scadaAddress: data.scadaAddress
        }).returning();

        try {
            await IEC104Service.getInstance().reloadConfigs();
        } catch (err) {
            console.error('[IEC104_REFRESH] Failed:', err);
        }

        res.status(201).json(point);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const bulkCreateDatasheetPoints = async (req: Request, res: Response) => {
    const { profileId, points } = req.body;
    try {
        if (!profileId || !Array.isArray(points)) {
            throw new AppError(ErrorCode.VALIDATION_FAILED, 'Profile ID and points array are required', 400);
        }

        const profile = await db.query.datasheetProfile.findFirst({
            where: eq(schema.datasheetProfile.id, profileId)
        });
        if (!profile) {
            throw new AppError(ErrorCode.DATASHEET_NOT_FOUND, 'Profile not found', 404);
        }

        const result = await db.transaction(async (tx) => {
            const createdPoints = [];
            for (const pointData of points) {
                const validated = createDataPointSchema.parse({ ...pointData, profileId: profileId });

                const existing = await tx.query.datasheetPoint.findFirst({
                    where: and(
                        eq(schema.datasheetPoint.profileId, profileId),
                        eq(schema.datasheetPoint.dataName, validated.dataName)
                    )
                });

                const values = {
                    profileId: profileId,
                    dataName: validated.dataName,
                    dataValue: validated.dataValue,
                    registerAddress: validated.registerAddress,
                    isActive: validated.isActive,
                    functionCode: validated.functionCode,
                    multiplier: validated.multiplier,
                    wordSwap: validated.wordSwap,
                    feederName: validated.feederName,
                    signalType: validated.signalType,
                    signalDescription: validated.signalDescription,
                    dataType: validated.dataType,
                    signalSource: validated.signalSource,
                    componentId: validated.componentId,
                    componentText: validated.componentText,
                    ioa1ObjectAddress: validated.ioa1ObjectAddress,
                    ioa2CellNo: validated.ioa2CellNo,
                    ioa3VoltageLevel: validated.ioa3VoltageLevel,
                    scadaAddress: validated.scadaAddress
                };

                if (existing) {
                    const [updated] = await tx.update(schema.datasheetPoint)
                        .set(values)
                        .where(eq(schema.datasheetPoint.id, existing.id))
                        .returning();
                    createdPoints.push(updated);
                } else {
                    const [created] = await tx.insert(schema.datasheetPoint)
                        .values(values)
                        .returning();
                    createdPoints.push(created);
                }
            }
            return createdPoints;
        });

        try {
            await IEC104Service.getInstance().reloadConfigs();
        } catch (err) {
            console.error('[BULK_IMPORT] Failed to refresh IEC104 service:', err);
        }

        res.status(201).json(result);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateDatasheetPoint = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createDataPointSchema.partial().parse(req.body);
        const [point] = await db.update(schema.datasheetPoint)
            .set(data as any)
            .where(eq(schema.datasheetPoint.id, id))
            .returning();

        try {
            await IEC104Service.getInstance().reloadConfigs();
        } catch (err) {
            console.error('[IEC104_REFRESH] Failed:', err);
        }

        res.json(point);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteDatasheetPoint = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.select({ count: sql<number>`count(*)` })
            .from(schema.telemetryValue)
            .where(eq(schema.telemetryValue.pointId, id));

        const telemetryCount = Number(result[0]?.count || 0);

        if (telemetryCount > 0) {
            throw new AppError(
                ErrorCode.VALIDATION_FAILED,
                `Bu veri noktasına ${telemetryCount} telemetri kaydı bağlı. Önce telemetri verilerini silmeniz gerekir. / Telemetry records exist.`,
                400
            );
        }

        await db.delete(schema.datasheetPoint).where(eq(schema.datasheetPoint.id, id));

        try {
            await IEC104Service.getInstance().reloadConfigs();
        } catch (err) {
            console.error('[IEC104_REFRESH] Failed:', err);
        }

        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
