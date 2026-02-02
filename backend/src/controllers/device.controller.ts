import { Request, Response } from 'express';

// Mocking Prisma for the demo to avoid connection errors if Postgres is not running
const prismaMock = {
    device: {
        findMany: async () => [
            { id: 'rtu-001', name: 'RTU Transformers-01', ipAddress: '192.168.1.10', status: 'ONLINE', mappings: [] },
            { id: 'rtu-002', name: 'Main Switchgear East', ipAddress: '192.168.1.11', status: 'ONLINE', mappings: [] }
        ],
        create: async (data: any) => ({ id: Math.random().toString(), ...data.data })
    },
    iOAMapping: {
        create: async (data: any) => ({ id: Math.random().toString(), ...data.data })
    }
};

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await prismaMock.device.findMany();
        res.json(devices);
    } catch (err) {
        res.json([]);
    }
};

export const createDevice = async (req: Request, res: Response) => {
    const { name, ipAddress, port, customerId } = req.body;
    const device = await prismaMock.device.create({
        data: { name, ipAddress, port, customerId }
    });
    res.json(device);
};

export const createMapping = async (req: Request, res: Response) => {
    const { deviceId, ioa, name, unit, scale, offset } = req.body;
    const mapping = await prismaMock.iOAMapping.create({
        data: { deviceId, ioa, name, unit, scale, offset }
    });
    res.json(mapping);
};
