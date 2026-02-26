import { Router } from 'express';
import { getSchemaStats, getHealthCheck, getRecordingSettings, updateRecordingSettings, runRetentionNow } from '../controllers/system.controller';

const router = Router();

router.get('/schema-stats', getSchemaStats);
router.get('/health-check', getHealthCheck);
router.get('/recording-settings', getRecordingSettings);
router.patch('/recording-settings', updateRecordingSettings);
router.post('/run-retention', runRetentionNow);

export default router;
