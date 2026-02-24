import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { AdminType } from '@prisma/client';

const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.nativeEnum(AdminType),
    password: z.string().optional(),
    companyProfileId: z.string().optional().nullable()
});

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.appUser.findMany({
            include: {
                profiles: {
                    select: {
                        company_id: true,
                        company: {
                            select: { id: true, name: true }
                        }
                    },
                    take: 1
                }
            }
        });

        // Flatten for frontend
        const mappedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            name: `${u.firstName} ${u.lastName}`.trim(),
            role: u.adminType,
            companyProfileId: u.profiles?.[0]?.company_id || null,
            companyProfile: u.profiles?.[0]?.company || null,
        }));

        res.json(mappedUsers);
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const data = createUserSchema.parse(req.body);

        const nameParts = data.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

        const user = await prisma.appUser.create({
            data: {
                userCode: Math.random().toString(36).substring(7),
                firstName,
                lastName,
                email: data.email,
                adminType: data.role,
            }
        });

        if (data.companyProfileId) {
            await prisma.appUserProfile.create({
                data: {
                    user_id: user.id,
                    company_id: data.companyProfileId,
                    permissionLevel: 'READ'
                }
            });
        }

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
