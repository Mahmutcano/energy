import { Router } from 'express';
import { getProtocols, createProtocol, updateProtocol, deleteProtocol } from '../controllers/protocol.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/comm-protocols', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getProtocols);
router.post('/comm-protocols', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createProtocol);
router.patch('/comm-protocols/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateProtocol);
router.delete('/comm-protocols/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteProtocol);

export default router;
