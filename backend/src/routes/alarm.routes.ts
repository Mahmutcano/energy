import { Router } from 'express';
import { getAlarms, resolveAlarm } from '../controllers/alarm.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/alarms', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getAlarms);
router.patch('/alarms/:id/resolve', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), resolveAlarm);

export default router;
