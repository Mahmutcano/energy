import { Router } from 'express';
import { getDevices, createDevice, deleteDevice } from '../controllers/device.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/devices', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getDevices);
router.post('/devices', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createDevice);
router.delete('/devices/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), deleteDevice);

export default router;
