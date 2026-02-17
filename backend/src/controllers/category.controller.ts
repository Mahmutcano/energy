import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const categorySchema = z.object({
    categoryName: z.string().min(1),
    isActive: z.boolean().optional(),
});

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.deviceCategory.findMany({
            include: {
                devices: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(categories);
    } catch (error) {
        console.error('getCategories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const data = categorySchema.parse(req.body);
        const category = await prisma.deviceCategory.create({
            data: {
                categoryName: data.categoryName,
                isActive: data.isActive ?? true,
            }
        });
        res.status(201).json(category);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createCategory error:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const data = categorySchema.partial().parse(req.body);
        const category = await prisma.deviceCategory.update({
            where: { id: String(id) },
            data,
        });
        res.json(category);
    } catch (error) {
        console.error('updateCategory error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.deviceCategory.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteCategory error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};
