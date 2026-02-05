import { Request, Response } from 'express';
import { DeviceSchema, IOAMappingSchema } from '../utils/validation';

// Mocking Prisma for the demo to avoid connection errors if Postgres is not running
const prismaMock = {
    device: {
        findMany: async () => [
            { id: 'rtu-001', name: 'RTU Transformers-01', ipAddress: '192.168.1.10', protocol: 'IEC104', status: 'ONLINE', mappings: [] },
            { id: 'rtu-002', name: 'Modbus Inverter-02', ipAddress: '178.242.103.255', protocol: 'MODBUS_TCP', port: 502, slaveId: 255, status: 'ONLINE', mappings: [] }
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
        res.status(500).json([]);
    }
};

export const createDevice = async (req: Request, res: Response) => {
    try {
        const validatedData = DeviceSchema.parse(req.body);
        const device = await prismaMock.device.create({
            data: validatedData
        });
        res.status(201).json(device);
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};

export const createMapping = async (req: Request, res: Response) => {
    try {
        const validatedData = IOAMappingSchema.parse(req.body);
        const mapping = await prismaMock.iOAMapping.create({
            data: validatedData
        });
        res.status(201).json(mapping);
    } catch (err: any) {
        res.status(400).json({ error: err.errors || err.message });
    }
};
