import { db } from '../db';
import * as schema from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { io } from '../app';

class AlarmService {
    private static instance: AlarmService;
    private activeCommAlarmDeviceIds: Set<string> = new Set();
    private isInitialized: boolean = false;

    private constructor() { }

    public static getInstance(): AlarmService {
        if (!AlarmService.instance) {
            AlarmService.instance = new AlarmService();
        }
        return AlarmService.instance;
    }

    /**
     * Initialize the service by loading active alarms from DB into memory.
     */
    public async init() {
        if (this.isInitialized) return;
        try {
            const active = await db.query.communicationAlarm.findMany({
                where: eq(schema.communicationAlarm.status, 'ACTIVE')
            });
            this.activeCommAlarmDeviceIds = new Set(active.map(a => a.deviceId));
            this.isInitialized = true;
            console.log(`[ALARM] Service initialized with ${this.activeCommAlarmDeviceIds.size} active alarms.`);
        } catch (err) {
            console.error('[ALARM] Initialization Error:', err);
            // Mark as initialized anyway to prevent repeated DB queries on failure
            this.isInitialized = true;
        }
    }

    /**
     * SYNC check: Does this device have an active alarm? (No DB hit)
     */
    public hasActiveAlarm(deviceId: string): boolean {
        return this.activeCommAlarmDeviceIds.has(deviceId);
    }

    /**
     * Mark a device as "seen" in memory. Actual DB resolution happens in resolveCommAlarm.
     */
    public markDeviceSeen(deviceId: string) {
        // Just clear from in-memory set — no DB call, no async, no blocking
        if (this.activeCommAlarmDeviceIds.has(deviceId)) {
            // Schedule async resolution without blocking the caller
            this.resolveCommAlarm(deviceId).catch(err => {
                console.error('[ALARM] Background resolve error:', err);
            });
        }
    }

    /**
     * Trigger a communication alarm if one doesn't already exist for this device.
     */
    public async triggerCommAlarm(deviceId: string, lastSeenAt: Date) {
        try {
            await this.init();

            if (this.activeCommAlarmDeviceIds.has(deviceId)) return;

            const active = await db.query.communicationAlarm.findFirst({
                where: and(
                    eq(schema.communicationAlarm.deviceId, deviceId),
                    eq(schema.communicationAlarm.status, 'ACTIVE')
                )
            });

            if (active) {
                this.activeCommAlarmDeviceIds.add(deviceId);
                return;
            }

            const [newAlarm] = await db.insert(schema.communicationAlarm).values({
                deviceId,
                status: 'ACTIVE',
                startTime: new Date(),
                lastSeenAt,
                message: 'Veri akışı kesildi / Data stream interrupted'
            }).returning();

            this.activeCommAlarmDeviceIds.add(deviceId);

            io.emit('alarm:comm:new', newAlarm);
            console.warn(`[ALARM] ⚠️ Communication lost for device: ${deviceId}`);
        } catch (err) {
            console.error('[ALARM] Trigger Comm Alarm Error:', err);
        }
    }

    /**
     * Resolve an active communication alarm if it exists.
     */
    public async resolveCommAlarm(deviceId: string) {
        try {
            await this.init();

            if (!this.activeCommAlarmDeviceIds.has(deviceId)) return;

            const active = await db.query.communicationAlarm.findFirst({
                where: and(
                    eq(schema.communicationAlarm.deviceId, deviceId),
                    eq(schema.communicationAlarm.status, 'ACTIVE')
                )
            });

            if (!active) {
                this.activeCommAlarmDeviceIds.delete(deviceId);
                return;
            }

            const [resolved] = await db.update(schema.communicationAlarm)
                .set({
                    status: 'RESOLVED',
                    endTime: new Date()
                })
                .where(eq(schema.communicationAlarm.id, active.id))
                .returning();

            this.activeCommAlarmDeviceIds.delete(deviceId);

            io.emit('alarm:comm:resolved', resolved);
            console.log(`[ALARM] ✅ Communication restored for device: ${deviceId}`);
        } catch (err) {
            console.error('[ALARM] Resolve Comm Alarm Error:', err);
        }
    }

    /**
     * Get all active communication alarms.
     */
    public async getActiveCommAlarms() {
        return await db.query.communicationAlarm.findMany({
            where: eq(schema.communicationAlarm.status, 'ACTIVE'),
            with: {
                device: true
            }
        });
    }

    /**
     * Get recent communication alarms history.
     */
    public async getAlarmHistory(limit: number = 50) {
        return await db.query.communicationAlarm.findMany({
            limit,
            orderBy: [desc(schema.communicationAlarm.startTime)],
            with: {
                device: true
            }
        });
    }
}

export default AlarmService.getInstance();
