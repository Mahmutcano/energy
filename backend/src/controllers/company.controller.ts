import { Request, Response } from 'express';
import prisma from '../lib/prisma';
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
        const companies = await prisma.companyProfile.findMany({
            include: {
                plants: {
                    select: { id: true, plantName: true, plantType: true }
                },
                _count: {
                    select: { userProfiles: true }
                }
            }
        });
        res.json(companies);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createCompany = async (req: Request, res: Response) => {
    try {
        const data = createCompanySchema.parse(req.body);

        const createData: any = {
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            representative: data.representative,
            taxOffice: data.taxOffice,
            taxNumber: data.taxNumber,
            isActive: data.isActive ?? true,
        };

        const company = await prisma.companyProfile.create({
            data: createData
        });

        res.status(201).json(company);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateCompany = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = createCompanySchema.partial().parse(req.body);

        const company = await prisma.companyProfile.update({
            where: { id: String(id) },
            data
        });

        res.json(company);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteCompany = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const plantsCount = await prisma.plant.count({ where: { company_id: String(id) } });
        if (plantsCount > 0) {
            throw new AppError(
                ErrorCode.COMPANY_HAS_PLANTS,
                `Bu firmaya bağlı ${plantsCount} santral bulunuyor. Önce santralleri silmelisiniz. / Company has ${plantsCount} connected plants.`,
                400
            );
        }

        const usersCount = await prisma.appUserProfile.count({ where: { company_id: String(id) } });
        if (usersCount > 0) {
            throw new AppError(
                ErrorCode.COMPANY_HAS_USERS,
                `Bu firmaya bağlı ${usersCount} kullanıcı bulunuyor. Önce kullanıcı yetkilerini silmelisiniz. / Company has ${usersCount} connected users.`,
                400
            );
        }

        await prisma.companyProfile.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
