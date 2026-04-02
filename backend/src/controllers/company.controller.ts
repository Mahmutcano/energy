
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
    isActive: z.boolean().optional(),
});

export const getCompanies = async (req: Request, res: Response) => {
    try {
        const companies = await db.query.companyProfile.findMany({
            with: {
                plants: {
                    columns: { id: true, plantName: true, plantType: true }
                }
            },
            extras: {
                usersCount: sql<number>`(SELECT count(*) FROM "AppUserProfile" WHERE "companyId" = ${schema.companyProfile.id})`.mapWith(Number).as('usersCount')
            }
        });

        const result = companies.map(c => ({
            ...c,
            _count: {
                userProfiles: (c as any).usersCount
            }
        }));

        res.json(result);
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
