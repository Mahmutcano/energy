
import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123456';

const AdminTypeValues = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER'] as const;

const LoginSchema = z.object({
    email: z.string(),
    password: z.string().min(1)
});

const RegisterSchema = z.object({
    email: z.string(),
    password: z.string().min(1),
    name: z.string().optional(),
    role: z.enum(AdminTypeValues).default('NORMAL_USER')
});

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role } = RegisterSchema.parse(req.body);

        const existingUser = await db.query.appUser.findFirst({
            where: eq(schema.appUser.email, email)
        });

        if (existingUser) {
            throw new AppError(ErrorCode.USER_EMAIL_EXISTS, 'Bu kullanıcı adı zaten kullanımda / Email already in use', 400);
        }

        const [user]: any = await db.insert(schema.appUser).values({
            userCode: Math.random().toString(36).substring(7),
            email,
            firstName: name ? name.split(' ')[0] : 'User',
            lastName: name ? name.split(' ').slice(1).join(' ') : 'Name',
            adminType: role as any
        }).returning();

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.adminType },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.adminType
            }
        });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);

        console.log(`[AUTH] Login attempt for: ${email}`);
        const user = await db.query.appUser.findFirst({
            where: eq(schema.appUser.email, email)
        });

        console.log(`[AUTH] User found: ${!!user}`);
        if (!user) {
            throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Geçersiz kullanıcı adı veya şifre / Invalid credentials', 401);
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.adminType },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.adminType,
            }
        });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
