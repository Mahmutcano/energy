import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { AdminType } from '@prisma/client';

const createUserSchema = z.object({
    userCode: z.string(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    adminType: z.nativeEnum(AdminType),
});

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.appUser.findMany({
            include: {
                profiles: true,
            }
        });
        res.json(users);
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const data = createUserSchema.parse(req.body);

        const user = await prisma.appUser.create({
            data: {
                userCode: data.userCode,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                adminType: data.adminType,
            }
        });

        res.status(201).json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createUser error:', error);
            if ((error as any).code === 'P2002') {
                return res.status(400).json({ error: 'Email already exists' });
            }
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.appUser.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
