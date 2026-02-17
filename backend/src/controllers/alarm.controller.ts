import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getAlarms = async (req: Request, res: Response) => {
    try {
        const alarms = await prisma.alarmLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100 // Limit to recent 100 for performance
        });
        res.json(alarms);
    } catch (error) {
        console.error('getAlarms error:', error);
        res.status(500).json({ error: 'Failed to fetch alarms' });
    }
};

export const resolveAlarm = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const alarm = await prisma.alarmLog.update({
            where: { id: String(id) },
            data: { resolved: true }
        });
        res.json(alarm);
    } catch (error) {
        console.error('resolveAlarm error:', error);
        res.status(500).json({ error: 'Failed to resolve alarm' });
    }
};
