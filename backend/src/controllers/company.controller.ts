import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

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
                plants: true,
                userProfiles: true,
            }
        });
        res.json(companies);
    } catch (error) {
        console.error('getCompanies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
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
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createCompany error:', error);
            res.status(500).json({ error: 'Failed to create company' });
        }
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
        console.error('updateCompany error:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
};

export const deleteCompany = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.companyProfile.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteCompany error:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
};
