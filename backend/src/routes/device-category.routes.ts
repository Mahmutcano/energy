import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/device-categories', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getCategories);
router.post('/device-categories', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createCategory);
router.patch('/device-categories/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), updateCategory);
router.delete('/device-categories/:id', authenticate, authorize(['SUPER_ADMIN']), deleteCategory);

export default router;
