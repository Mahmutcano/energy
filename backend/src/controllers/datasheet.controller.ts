
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, sql, asc, getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import { IEC104Service } from '../services/iec104.service';
import workerService from '../services/worker.service';

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
            pointsCount: sql<number>`(SELECT count(*) FROM "DatasheetPoint" WHERE "profileId" = "DatasheetProfile"."id")`.mapWith(Number),
            devicesCount: sql<number>`(SELECT count(*) FROM "Device" WHERE "datasheetProfileId" = "DatasheetProfile"."id")`.mapWith(Number)
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
    data: z.string().min(1, "Data alanı zorunludur"), // Combined Name/Value/Signal field
    dataName: z.string().optional().nullable(), // Legacy support
    dataValue: z.string().optional().nullable(), // Legacy support
    dataExplanation: z.string().optional().nullable(),
    address: z.coerce.number().int().min(0).optional().nullable(),
    registerAddress: z.number().int().min(0).optional().nullable(), // Legacy support
    isActive: z.boolean().optional().default(true),
    functionCode: z.number().int().min(1).max(16).optional().nullable(),
    multiplier: z.number().optional().nullable(),
    wordSwap: z.boolean().optional().nullable(),
    feederName: z.string().max(100).optional().nullable(),
    signalType: z.string().max(100).optional().nullable(),
    signalDescription: z.string().max(250).optional().nullable(), // Legacy support
    dataType: z.string().max(50).optional().nullable(),
    type: z.string().max(50).optional().nullable(), // Legacy support
    format: z.string().max(50).optional().nullable(), // Legacy support
    signalSource: z.string().max(100).optional().nullable(),
    componentId: z.string().max(100).optional().nullable(),
    componentText: z.string().max(250).optional().nullable(), // Legacy support
    ioa1ObjectAddress: z.coerce.number().int().min(0).optional().nullable(), // Legacy support
    ioa2CellNo: z.coerce.number().int().min(0).optional().nullable(),
    ioa3VoltageLevel: z.coerce.number().int().min(0).optional().nullable(),
    scadaAddress: z.coerce.number().int().min(0).optional().nullable(), // Legacy support
    measurementType: z.string().optional().nullable(),
    recordingInterval: z.coerce.number().int().min(0).optional().default(60), // Default 60 seconds
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
                asc(schema.datasheetPoint.address),
                asc(schema.datasheetPoint.data)
            ]
        });

        // Map fields for frontend compatibility (Address unification)
        const mappedPoints = points.map(p => ({
            ...p,
            dataName: p.data,
            scadaAddress: p.address,
            registerAddress: p.address,
            ioa1ObjectAddress: p.address
        }));

        res.json(mappedPoints);

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
                eq(schema.datasheetPoint.data, data.data || data.dataName || 'Unnamed')
            )
        });
        if (existingPoint) {
            throw new AppError(
                ErrorCode.VALIDATION_FAILED,
                `"${data.data}" adında bir veri noktası bu profilde zaten mevcut / Data point already exists`,
                409
            );
        }

        const unifiedData = data.data ?? data.dataName ?? data.signalDescription;
        const unifiedExplanation = data.dataExplanation ?? data.componentText;
        const unifiedAddress = data.address ?? data.registerAddress ?? data.ioa1ObjectAddress ?? data.scadaAddress;

        const [point] = await db.insert(schema.datasheetPoint).values({
            profileId: data.profileId,
            data: unifiedData || 'Unnamed',
            dataExplanation: unifiedExplanation,
            address: unifiedAddress,
            isActive: data.isActive,
            functionCode: data.functionCode,
            multiplier: data.multiplier,
            wordSwap: data.wordSwap,
            feederName: data.feederName,
            signalType: data.signalType,
            dataType: (data.dataType ?? data.type ?? data.format) as any,
            signalSource: data.signalSource,
            componentId: data.componentId,
            ioa2CellNo: data.ioa2CellNo,
            ioa3VoltageLevel: data.ioa3VoltageLevel,
            measurementType: data.measurementType as any,
            recordingInterval: data.recordingInterval,
        }).returning();

        try {
            await IEC104Service.getInstance().reloadConfigs();
            await workerService.reloadPointIntervals();
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
                        eq(schema.datasheetPoint.data, validated.data || validated.dataName || 'Unnamed')
                    )
                });

                const unifiedData = validated.data ?? validated.dataName ?? validated.signalDescription;
                const unifiedExplanation = validated.dataExplanation ?? validated.componentText;
                const unifiedAddress = validated.address ?? validated.registerAddress ?? validated.ioa1ObjectAddress ?? validated.scadaAddress;

                const values = {
                    profileId: profileId,
                    data: unifiedData || 'Unnamed',
                    dataExplanation: unifiedExplanation,
                    address: unifiedAddress,
                    isActive: validated.isActive,
                    functionCode: validated.functionCode,
                    multiplier: validated.multiplier,
                    wordSwap: validated.wordSwap,
                    feederName: validated.feederName,
                    signalType: validated.signalType,
                    dataType: (validated.dataType ?? validated.type ?? validated.format) as any,
                    signalSource: validated.signalSource,
                    componentId: validated.componentId,
                    ioa2CellNo: validated.ioa2CellNo,
                    ioa3VoltageLevel: validated.ioa3VoltageLevel,
                    measurementType: validated.measurementType as any,
                    recordingInterval: validated.recordingInterval
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
            await workerService.reloadPointIntervals();
        } catch (err) {
            console.error('[BULK_IMPORT] Failed to refresh services:', err);
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

        // Unified field mapping for updates
        const updateValues: any = { ...data };
        
        if (data.data || data.dataName || data.signalDescription) {
            updateValues.data = data.data ?? data.dataName ?? data.signalDescription;
        }

        if (data.registerAddress !== undefined || data.ioa1ObjectAddress !== undefined || data.scadaAddress !== undefined) {
            updateValues.address = data.address ?? data.registerAddress ?? data.ioa1ObjectAddress ?? data.scadaAddress;
        }
        
        if (data.signalDescription !== undefined || data.componentText !== undefined) {
            updateValues.dataExplanation = data.dataExplanation ?? data.componentText;
        }

        if (data.dataType !== undefined || data.type !== undefined || data.format !== undefined) {
            updateValues.dataType = data.dataType ?? data.type ?? data.format;
        }

        if (data.measurementType !== undefined) {
            updateValues.measurementType = data.measurementType;
        }

        if (data.recordingInterval !== undefined) {
            updateValues.recordingInterval = data.recordingInterval;
        }

        // Remove legacy fields from update object
        delete updateValues.dataName;
        delete updateValues.dataValue;
        delete updateValues.type;
        delete updateValues.format;
        delete updateValues.registerAddress;
        delete updateValues.ioa1ObjectAddress;
        delete updateValues.scadaAddress;
        delete updateValues.signalDescription;
        delete updateValues.componentText;


        const [point] = await db.update(schema.datasheetPoint)
            .set(updateValues)
            .where(eq(schema.datasheetPoint.id, id))
            .returning();

        try {
            await IEC104Service.getInstance().reloadConfigs();
            await workerService.reloadPointIntervals();
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
            await workerService.reloadPointIntervals();
        } catch (err) {
            console.error('[IEC104_REFRESH] Failed:', err);
        }

        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
