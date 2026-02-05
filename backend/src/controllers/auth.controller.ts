import { Request, Response } from 'express';
import { z } from 'zod';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);

        // Mock login logic
        if (email === 'super@scada.com' && password === 'admin123') {
            return res.json({
                token: 'mock-jwt-super-admin',
                user: { id: 'u1', name: 'Super Admin', role: 'SUPER_ADMIN', email }
            });
        }

        if (email === 'admin@customer.com' && password === 'admin123') {
            return res.json({
                token: 'mock-jwt-admin',
                user: { id: 'u2', name: 'Customer Admin', role: 'ADMIN', email, customerId: 'c1' }
            });
        }

        res.status(401).json({ message: 'Geçersiz email veya şifre' });
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};
