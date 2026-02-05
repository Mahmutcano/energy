import { Router } from 'express';
import { getCustomers, createCustomer, getUsers, createUser } from '../controllers/admin.controller';
import { authorize } from '../middleware/auth';

const router = Router();

// Only Super Admin can manage customers and global users
router.get('/customers', authorize(['SUPER_ADMIN']), getCustomers);
router.post('/customers', authorize(['SUPER_ADMIN']), createCustomer);
router.get('/all-users', authorize(['SUPER_ADMIN']), getUsers);
router.post('/all-users', authorize(['SUPER_ADMIN']), createUser);

export default router;
