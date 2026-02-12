import { Router } from 'express';
import { getCustomers, createCustomer, getUsers, createUser, testModbus } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Only Super Admin can manage customers and global users
router.get('/customers', authenticate, authorize(['SUPER_ADMIN']), getCustomers);
router.post('/customers', authenticate, authorize(['SUPER_ADMIN']), createCustomer);
router.get('/all-users', authenticate, authorize(['SUPER_ADMIN']), getUsers);
router.post('/all-users', authenticate, authorize(['SUPER_ADMIN']), createUser);

// Modbus Test Environment (Super Admin only)
router.post('/modbus-test', authenticate, authorize(['SUPER_ADMIN']), testModbus);

export default router;
