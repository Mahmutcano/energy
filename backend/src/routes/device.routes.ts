import { Router } from 'express';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../controllers/device.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/devices', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getDevices);
router.post('/devices', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createDevice);
router.patch('/devices/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateDevice);
router.delete('/devices/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteDevice);

export default router;
