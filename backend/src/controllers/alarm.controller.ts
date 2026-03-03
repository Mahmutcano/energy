import { Request, Response } from 'express';
import alarmService from '../services/alarm.service';
import { handleErrorResponse } from '../utils/errors';

export const getAlarms = async (req: Request, res: Response) => {
    try {
        const history = await alarmService.getAlarmHistory();
        res.json(history);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};

export const resolveAlarm = async (req: Request, res: Response) => {
    try {
        res.status(501).json({ error: 'Manual resolution is handled by data resumption' });
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
