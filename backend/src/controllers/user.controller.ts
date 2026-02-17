import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
    role: z.nativeEnum(Role),
    companyProfileId: z.string().optional().nullable(),
});

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                companyProfile: true, // Include company name
            },
            orderBy: { createdAt: 'desc' }
        });

        // Exclude password from response
        const sanitizedUsers = users.map(user => {
            const { password, ...rest } = user;
            return rest;
        });

        res.json(sanitizedUsers);
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const data = createUserSchema.parse(req.body);

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name,
                role: data.role,
                companyProfileId: data.companyProfileId || null,
            }
        });

        const { password, ...userWithoutPassword } = user;

        res.status(201).json(userWithoutPassword);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('createUser error:', error);
            // Handle unique constraint violation (P2002) for email
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
        await prisma.user.delete({ where: { id: String(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}
