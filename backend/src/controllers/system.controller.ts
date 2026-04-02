
import { Request, Response } from 'express';
import { db, timescaleDb } from '../db';
import * as schema from '../db/schema';
import { sql, eq, lt, desc, and } from 'drizzle-orm';
import { AppError, ErrorCode, handleErrorResponse } from '../utils/errors';
import redisService from '../services/redis.service';
import { getApproximateTelemetryCount } from '../utils/telemetry';
import workerService from '../services/worker.service';
import simulationService from '../services/simulation.service';

const getCount = async (table: any) => {
    const result = await db.select({ count: sql<number>`count(*)` }).from(table);
    return Number(result[0]?.count || 0);
};

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
            getCount(schema.appUser),
            getCount(schema.companyProfile),
            getCount(schema.plant),
            getCount(schema.protocolConfig),
            getCount(schema.modbusConfig),
            getCount(schema.iec104Config),
            getCount(schema.device),
            getCount(schema.datasheetProfile),
            getCount(schema.datasheetPoint),
            timescaleDb.select({ count: sql<number>`count(*)` }).from(schema.telemetryValue).then(res => Number(res[0].count))
        ]);

        const stats = [
            { id: 'AppUser', name: 'Users', count: users, icon: 'ShieldCheck', color: '#10b981', relations: [] },
            { id: 'CompanyProfile', name: 'Companies', count: companies, icon: 'Building2', color: '#f59e0b', relations: ['Plant', 'AppUserProfile'] },
            { id: 'Plant', name: 'Power Plants', count: plants, icon: 'Factory', color: '#3b82f6', relations: ['ProtocolConfig', 'AppUserProfile'] },
            { id: 'ProtocolConfig', name: 'Protocols', count: protocols, icon: 'Network', color: '#8b5cf6', relations: ['Device', 'ModbusConfig', 'IEC104Config'] },
            { id: 'Device', name: 'Devices', count: devices, icon: 'Cpu', color: '#10b981', relations: ['TelemetryValue', 'AppUserProfile'] },
            { id: 'DatasheetProfile', name: 'Profiles', count: profiles, icon: 'FileText', color: '#ec4899', relations: ['DatasheetPoint', 'Device'] },
            { id: 'DatasheetPoint', name: 'Data Points', count: points, icon: 'Hash', color: '#6366f1', relations: ['TelemetryValue'] },
            { id: 'TelemetryValue', name: 'Telemetries', count: telemetries, icon: 'Activity', color: '#ef4444', relations: [] },
        ];

        res.json(stats);
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
        await db.execute(sql`SELECT 1`);
        const dbLatency = Date.now() - dbStart;

        // Get recent telemetry stats
        const [totalRecords, latestRecord, activeDevices, totalDevices] = await Promise.all([
            getApproximateTelemetryCount(),
            timescaleDb.query.telemetryValue.findFirst({
                orderBy: [desc(schema.telemetryValue.measurementTime)],
                columns: { measurementTime: true }
            }),
            db.select({ count: sql<number>`count(*)` })
                .from(schema.device)
                .where(eq(schema.device.isActive, true))
                .then(res => Number(res[0].count)),
            getCount(schema.device)
        ]);

        const lastRecordAge = latestRecord?.measurementTime
            ? Math.round((Date.now() - new Date(latestRecord.measurementTime).getTime()) / 1000)
            : null;

        checks.postgresql = {
            status: 'HEALTHY',
            latency: dbLatency,
            totalRecords,
            lastRecordAge,
            activeDevices,
            totalDevices,
            recording: lastRecordAge !== null && lastRecordAge < 60
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

    // 3. Worker Service Check
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
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
    };

    // 5. Uptime
    checks.uptime = {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime())
    };

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

export const getRecordingSettings = async (req: Request, res: Response) => {
    try {
        const settings = simulationService.getSettings();
        const [totalRecords, dbSizeResult] = await Promise.all([
            timescaleDb.select({ count: sql<number>`count(*)` }).from(schema.telemetryValue).then(res => Number(res[0].count)),
            timescaleDb.execute(sql`SELECT pg_size_pretty(pg_total_relation_size('"TelemetryValue"')) as size`)
        ]);

        res.json({
            ...settings,
            db: {
                totalRecords,
                tableSize: (dbSizeResult.rows[0] as any)?.size || 'Unknown'
            }
        });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const updateRecordingSettings = async (req: Request, res: Response) => {
    try {
        const { sampleIntervalSec, retentionHours, maxRecordsTotal, isRecording } = req.body;
        simulationService.updateSettings({
            sampleIntervalSec,
            retentionHours,
            maxRecordsTotal,
            isRecording
        });
        const updated = simulationService.getSettings();
        res.json({ message: 'Settings updated', settings: updated });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const runRetentionNow = async (req: Request, res: Response) => {
    try {
        const beforeCount = await timescaleDb.select({ count: sql<number>`count(*)` }).from(schema.telemetryValue).then(res => Number(res[0].count));
        const settings = simulationService.getSettings();
        const cutoff = new Date(Date.now() - settings.retentionHours * 60 * 60 * 1000);

        const deleteResult = await timescaleDb.delete(schema.telemetryValue).where(lt(schema.telemetryValue.measurementTime, cutoff));
        const afterCount = await timescaleDb.select({ count: sql<number>`count(*)` }).from(schema.telemetryValue).then(res => Number(res[0].count));

        res.json({
            message: 'Retention executed',
            before: beforeCount,
            deleted: deleteResult.rowCount,
            after: afterCount,
            retentionHours: settings.retentionHours
        });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
