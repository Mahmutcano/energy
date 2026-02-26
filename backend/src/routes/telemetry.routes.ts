import { Router } from 'express';
import { getTelemetryHistory } from '../controllers/telemetry.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/telemetry/history', authenticate, getTelemetryHistory);

export default router;
