import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123456';

const LoginSchema = z.object({
    email: z.string(),
    password: z.string().min(1)
});

const RegisterSchema = z.object({
    email: z.string(),
    password: z.string().min(1),
    name: z.string().optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']).default('CUSTOMER')
});

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role } = RegisterSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu email adresi zaten kullanımda' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz email veya şifre' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Geçersiz email veya şifre' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                customerId: user.customerId
            }
        });
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};
