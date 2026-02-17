import { Router } from 'express';
import { testModbus } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Modbus Test Environment (Super Admin only)
router.post('/modbus-test', authenticate, authorize(['SUPER_ADMIN']), testModbus);

export default router;
