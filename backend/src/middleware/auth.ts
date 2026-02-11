import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123456';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: Role;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Lütfen giriş yapın' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }
};

export const authorize = (roles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Lütfen önce giriş yapın' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }

        next();
    };
};
