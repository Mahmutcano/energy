import { Router } from 'express';
import { testModbus, testIEC104, triggerManualGI } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Modbus Test Environment (Super Admin only)
router.post('/modbus-test', authenticate, authorize(['SUPER_ADMIN']), testModbus);

// IEC 104 Test Environment (Super Admin only)
router.post('/iec104-test', authenticate, authorize(['SUPER_ADMIN']), testIEC104);
router.post('/iec104-gi', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), triggerManualGI);

export default router;
