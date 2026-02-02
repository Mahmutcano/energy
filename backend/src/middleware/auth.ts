import { Request, Response, NextFunction } from 'express';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export const authorize = (roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // In a real app, we would get the user from the JWT token
        const userRole = req.headers['x-user-role'] as Role;

        if (!userRole) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        next();
    };
};
