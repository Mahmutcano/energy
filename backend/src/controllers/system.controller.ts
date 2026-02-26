import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import redisService from '../services/redis.service';
import { getApproximateTelemetryCount } from '../utils/telemetry';
import workerService from '../services/worker.service';

export const getSchemaStats = async (req: Request, res: Response) => {
    try {
        const [
            users,
            companies,
            plants,
            protocols,
            modbusConfigs,
            iec104Configs,
            devices,
            profiles,
            points,
            telemetries
        ] = await Promise.all([
            prisma.appUser.count(),
            prisma.companyProfile.count(),
            prisma.plant.count(),
            prisma.protocolConfig.count(),
            prisma.modbusConfig.count(),
            prisma.iEC104Config.count(),
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

export const getHealthCheck = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const checks: any = {};

    // 1. PostgreSQL Check
    try {
        const dbStart = Date.now();
        await prisma.$queryRawUnsafe('SELECT 1');
        const dbLatency = Date.now() - dbStart;

        // Get recent telemetry stats
        // Use fast approximate count instead of slow COUNT(*)
        const [totalRecords, latestRecord, activeDevices, totalDevices] = await Promise.all([
            getApproximateTelemetryCount(),
            prisma.telemetryValue.findFirst({ orderBy: { measurementTime: 'desc' }, select: { measurementTime: true } }),
            prisma.device.count({ where: { isActive: true } }),
            prisma.device.count()
        ]);

        const lastRecordAge = latestRecord?.measurementTime
            ? Math.round((Date.now() - new Date(latestRecord.measurementTime).getTime()) / 1000)
            : null;

        checks.postgresql = {
            status: 'HEALTHY',
            latency: dbLatency,
            totalRecords,
            lastRecordAge, // seconds since last record
            activeDevices,
            totalDevices,
            recording: lastRecordAge !== null && lastRecordAge < 60 // recording if last record < 60s ago
        };
    } catch (err: any) {
        checks.postgresql = {
            status: 'DOWN',
            latency: null,
            error: err.message,
            recording: false
        };
    }

    // 2. Redis Check
    try {
        const redisStatus = redisService.getStatus();
        const queueLength = await redisService.getQueueLength();

        checks.redis = {
            status: redisStatus.connected ? 'HEALTHY' : 'FALLBACK',
            mode: redisStatus.mode,
            queueLength: queueLength
        };
    } catch (err: any) {
        checks.redis = {
            status: 'DOWN',
            mode: 'UNKNOWN',
            queueLength: null,
            error: err.message
        };
    }

    // 3. Worker Service Check (real metrics)
    const workerMetrics = workerService.getMetrics();
    checks.worker = {
        status: workerMetrics.isRunning ? (checks.postgresql?.recording ? 'ACTIVE' : 'IDLE') : 'STOPPED',
        bufferMode: checks.redis?.mode || 'UNKNOWN',
        processedTotal: workerMetrics.processedTotal,
        bufferSize: workerMetrics.bufferSize
    };

    // 4. Memory Usage
    const mem = process.memoryUsage();
    checks.memory = {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
    };

    // 5. Uptime
    checks.uptime = {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime())
    };

    // 6. Overall status
    const allHealthy = checks.postgresql?.status === 'HEALTHY' &&
        (checks.redis?.status === 'HEALTHY' || checks.redis?.status === 'FALLBACK');

    const responseTime = Date.now() - startTime;

    res.json({
        status: allHealthy ? 'OPERATIONAL' : 'DEGRADED',
        responseTime,
        timestamp: new Date().toISOString(),
        checks
    });
};

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}
