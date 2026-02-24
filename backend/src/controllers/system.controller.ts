import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';

export const getSchemaStats = async (req: Request, res: Response) => {
    try {
        const [
            users,
            companies,
            plants,
            protocols,
            devices,
            profiles,
            points,
            telemetries
        ] = await Promise.all([
            prisma.appUser.count(),
            prisma.companyProfile.count(),
            prisma.plant.count(),
            prisma.protocolConfig.count(),
            prisma.device.count(),
            prisma.datasheetProfile.count(),
            prisma.datasheetPoint.count(),
            prisma.telemetryValue.count()
        ]);

        const schema = [
            { id: 'AppUser', name: 'Users', count: users, icon: 'ShieldCheck', color: '#10b981', relations: [] },
            { id: 'CompanyProfile', name: 'Companies', count: companies, icon: 'Building2', color: '#f59e0b', relations: ['Plant', 'AppUserProfile'] },
            { id: 'Plant', name: 'Power Plants', count: plants, icon: 'Factory', color: '#3b82f6', relations: ['ProtocolConfig', 'AppUserProfile'] },
            { id: 'ProtocolConfig', name: 'Protocols', count: protocols, icon: 'Network', color: '#8b5cf6', relations: ['Device', 'ModbusConfig', 'IEC104Config'] },
            { id: 'Device', name: 'Devices', count: devices, icon: 'Cpu', color: '#10b981', relations: ['TelemetryValue', 'AppUserProfile'] },
            { id: 'DatasheetProfile', name: 'Profiles', count: profiles, icon: 'FileText', color: '#ec4899', relations: ['DatasheetPoint', 'Device'] },
            { id: 'DatasheetPoint', name: 'Data Points', count: points, icon: 'Hash', color: '#6366f1', relations: ['TelemetryValue'] },
            { id: 'TelemetryValue', name: 'Telemetries', count: telemetries, icon: 'Activity', color: '#ef4444', relations: [] },
        ];

        res.json(schema);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
