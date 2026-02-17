import { Router } from 'express';
import { getAlarms, resolveAlarm } from '../controllers/alarm.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/alarms', authenticate, getAlarms);
router.patch('/alarms/:id/resolve', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), resolveAlarm);

export default router;
