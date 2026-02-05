import { Request, Response } from 'express';

// Mocking prisma for admin operations
const prismaMock = {
    customer: {
        findMany: async () => [
            { id: 'c1', name: 'Enerji A.Ş.', description: 'Ege Bölgesi Santralleri' },
            { id: 'c2', name: 'Güneş Gücü Ltd.', description: 'İç Anadolu Santralleri' }
        ],
        create: async (data: any) => ({ id: Math.random().toString(), ...data.data })
    },
    user: {
        findMany: async () => [
            { id: 'u1', name: 'Ali Yılmaz', email: 'ali@enerji.com', role: 'ADMIN', customerId: 'c1' },
            { id: 'u2', name: 'Ayşe Demir', email: 'ayse@gunes.com', role: 'CUSTOMER', customerId: 'c2' }
        ],
        create: async (data: any) => ({ id: Math.random().toString(), ...data.data })
    }
};

export const getCustomers = async (req: Request, res: Response) => {
    const customers = await prismaMock.customer.findMany();
    res.json(customers);
};

export const createCustomer = async (req: Request, res: Response) => {
    const customer = await prismaMock.customer.create({ data: req.body });
    res.json(customer);
};

export const getUsers = async (req: Request, res: Response) => {
    const users = await prismaMock.user.findMany();
    res.json(users);
};

export const createUser = async (req: Request, res: Response) => {
    const user = await prismaMock.user.create({ data: req.body });
    res.json(user);
};
