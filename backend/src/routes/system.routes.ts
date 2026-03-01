import { Router } from 'express';
import { getSchemaStats, getHealthCheck, getRecordingSettings, updateRecordingSettings, runRetentionNow } from '../controllers/system.controller';
import { IEC104Service } from '../services/iec104.service';
import ModbusService from '../services/modbus.service';
import redisService from '../services/redis.service';

const router = Router();

router.get('/schema-stats', getSchemaStats);
router.get('/health-check', getHealthCheck);
router.get('/recording-settings', getRecordingSettings);
router.patch('/recording-settings', updateRecordingSettings);
router.post('/run-retention', runRetentionNow);

router.get('/protocol-statuses', (req, res) => {
    const iecStatus = IEC104Service.getInstance().getStatuses();
    const modbusStatus = ModbusService.getStatuses();
    res.json({ ...iecStatus, ...modbusStatus });
});

router.post('/flush-telemetry', async (req, res) => {
    try {
        await redisService.flushTelemetryQueue();
        res.json({ success: true, message: 'Telemetry queue cleared' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
