
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const createCompanySchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    representative: z.string().optional().nullable(),
    taxOffice: z.string().optional().nullable(),
    taxNumber: z.number().optional().nullable(),
    ytbsUsername: z.string().optional().nullable(),
    ytbsPassword: z.string().optional().nullable(),
    ytbsApiUsername: z.string().optional().nullable(),
    ytbsApiPassword: z.string().optional().nullable(),
    ytbsApiKey: z.string().optional().nullable(),
    baglantiAnlasmasiSirketiLisansNo: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
});

export const getCompanies = async (req: Request, res: Response) => {
    try {
        const companies = await db.select({
            id: schema.companyProfile.id,
            name: schema.companyProfile.name,
            address: schema.companyProfile.address,
            phone: schema.companyProfile.phone,
            email: schema.companyProfile.email,
            representative: schema.companyProfile.representative,
            taxOffice: schema.companyProfile.taxOffice,
            taxNumber: schema.companyProfile.taxNumber,
            ytbsUsername: schema.companyProfile.ytbsUsername,
            ytbsPassword: schema.companyProfile.ytbsPassword,
            ytbsApiUsername: schema.companyProfile.ytbsApiUsername,
            ytbsApiPassword: schema.companyProfile.ytbsApiPassword,
            ytbsApiKey: schema.companyProfile.ytbsApiKey,
            baglantiAnlasmasiSirketiLisansNo: schema.companyProfile.baglantiAnlasmasiSirketiLisansNo,
            isActive: schema.companyProfile.isActive,
            createdAt: schema.companyProfile.createdAt,
            updatedAt: schema.companyProfile.updatedAt,
            createdBy: schema.companyProfile.createdBy,
            updatedBy: schema.companyProfile.updatedBy,
            userCount: sql<number>`(SELECT count(*) FROM "AppUserProfile" WHERE "companyId" = "CompanyProfile"."id")`.mapWith(Number),
            plantCount: sql<number>`(SELECT count(*) FROM "Plant" WHERE "companyId" = "CompanyProfile"."id")`.mapWith(Number)
        }).from(schema.companyProfile);

        res.json(companies);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        const data = createCompanySchema.parse(req.body);

        const [company] = await db.insert(schema.companyProfile).values({
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            representative: data.representative,
            taxOffice: data.taxOffice,
            taxNumber: data.taxNumber,
            ytbsUsername: data.ytbsUsername,
            ytbsPassword: data.ytbsPassword,
            ytbsApiUsername: data.ytbsApiUsername,
            ytbsApiPassword: data.ytbsApiPassword,
            ytbsApiKey: data.ytbsApiKey,
            baglantiAnlasmasiSirketiLisansNo: data.baglantiAnlasmasiSirketiLisansNo,
            isActive: data.isActive ?? true,
        }).returning();

        res.status(201).json(company);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateCompany = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const data = createCompanySchema.partial().parse(req.body);

        const [company] = await db.update(schema.companyProfile)
            .set(data as any)
            .where(eq(schema.companyProfile.id, id))
            .returning();

        res.json(company);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteCompany = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        const plantsResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.plant)
            .where(eq(schema.plant.companyId, id));

        const plantsCount = Number(plantsResult[0]?.count || 0);

        if (plantsCount > 0) {
            throw new AppError(
                ErrorCode.COMPANY_HAS_PLANTS,
                `Bu firmaya bağlı ${plantsCount} santral bulunuyor. Önce santralleri silmelisiniz. / Company has ${plantsCount} connected plants.`,
                400
            );
        }

        const usersResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.appUserProfile)
            .where(eq(schema.appUserProfile.companyId, id));

        const usersCount = Number(usersResult[0]?.count || 0);

        if (usersCount > 0) {
            throw new AppError(
                ErrorCode.COMPANY_HAS_USERS,
                `Bu firmaya bağlı ${usersCount} kullanıcı bulunuyor. Önce kullanıcı yetkilerini silmelisiniz. / Company has ${usersCount} connected users.`,
                400
            );
        }

        await db.delete(schema.companyProfile).where(eq(schema.companyProfile.id, id));
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
