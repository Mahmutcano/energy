import { Router } from 'express';
import { getUsers, createUser, deleteUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/users', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), getUsers);
router.post('/users', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createUser);
router.delete('/users/:id', authenticate, authorize(['SUPER_ADMIN']), deleteUser);

export default router;
