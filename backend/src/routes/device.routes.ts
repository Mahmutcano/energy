import { Router } from 'express';
import { getDevices, createDevice, createCommProtocol } from '../controllers/device.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/devices', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getDevices);
router.post('/devices', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createDevice);
router.post('/mappings', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createCommProtocol);

export default router;
