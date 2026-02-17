import { Router } from 'express';
import { getProtocols, createProtocol, deleteProtocol } from '../controllers/protocol.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/comm-protocols', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), getProtocols);
router.post('/comm-protocols', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createProtocol);
router.delete('/comm-protocols/:id', authenticate, authorize(['SUPER_ADMIN']), deleteProtocol);

export default router;
