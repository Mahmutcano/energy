import { Router } from 'express';
import { getSchemaStats, getHealthCheck } from '../controllers/system.controller';

const router = Router();

router.get('/schema-stats', getSchemaStats);
router.get('/health-check', getHealthCheck);

export default router;
