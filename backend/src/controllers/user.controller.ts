
import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const AdminTypeValues = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER'] as const;

const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(AdminTypeValues),
    password: z.string().optional(),
    companyProfileId: z.string().uuid().optional().nullable()
});

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await db.query.appUser.findMany({
            with: {
                profiles: {
                    limit: 1,
                    with: {
                        company: {
                            columns: { id: true, name: true }
                        }
                    }
                }
            }
        });

        const mappedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            name: `${u.firstName} ${u.lastName}`.trim(),
            role: u.adminType,
            companyProfileId: u.profiles?.[0]?.companyId || null,
            companyProfile: u.profiles?.[0]?.company || null,
        }));

        res.json(mappedUsers);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const data = createUserSchema.parse(req.body);

        const nameParts = data.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

        const existingEmail = await db.query.appUser.findFirst({
            where: eq(schema.appUser.email, data.email)
        });

        if (existingEmail) {
            throw new AppError(
                ErrorCode.USER_EMAIL_EXISTS,
                `Bu email adresi zaten kullanılıyor. / Email already exists.`,
                409
            );
        }

        const [user]: any = await db.insert(schema.appUser).values({
            userCode: Math.random().toString(36).substring(7),
            firstName,
            lastName,
            email: data.email,
            adminType: data.role as any
        }).returning();

        if (data.companyProfileId) {
            await db.insert(schema.appUserProfile).values({
                userId: user.id,
                companyId: data.companyProfileId,
                permissionLevel: 'READ'
            });
        }

        res.status(201).json(user);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const deleteUser = async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
        await db.delete(schema.appUserProfile).where(eq(schema.appUserProfile.userId, id));
        await db.delete(schema.appUser).where(eq(schema.appUser.id, id));
        res.status(204).send();
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
