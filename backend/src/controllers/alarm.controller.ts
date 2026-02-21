import { Request, Response } from 'express';

export const getAlarms = async (req: Request, res: Response) => {
    try {
        // The AlarmLog functionality is currently disabled in the new database schema
        res.json([]);
    } catch (error) {
        console.error('getAlarms error:', error);
        res.status(500).json({ error: 'Failed to fetch alarms' });
    }
};

export const resolveAlarm = async (req: Request, res: Response) => {
    try {
        res.status(501).json({ error: 'Alarm functionality is currently not supported in the new database schema' });
    } catch (error) {
        console.error('resolveAlarm error:', error);
        res.status(500).json({ error: 'Failed to resolve alarm' });
    }
};
