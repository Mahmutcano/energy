import { Router } from 'express';
import { getDevices, createDevice, createMapping } from '../controllers/device.controller';
import { authorize } from '../middleware/auth';

const router = Router();

router.get('/devices', authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getDevices);
router.post('/devices', authorize(['SUPER_ADMIN', 'ADMIN']), createDevice);
router.post('/mappings', authorize(['SUPER_ADMIN', 'ADMIN']), createMapping);

export default router;
