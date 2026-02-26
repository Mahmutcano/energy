import { Request, Response } from 'express';
import { queryTelemetry } from '../utils/telemetry';
import { handleErrorResponse } from '../utils/errors';

export const getTelemetryHistory = async (req: Request, res: Response) => {
    try {
        const { deviceId, pointId, hours } = req.query;

        if (!deviceId || !pointId) {
            return res.status(400).json({ message: 'deviceId and pointId are required' });
        }

        const data = await queryTelemetry(
            String(deviceId),
            String(pointId),
            hours ? Number(hours) : 24
        );

        res.json(data);
    } catch (error) {
        return handleErrorResponse(res, error);
    }
};
