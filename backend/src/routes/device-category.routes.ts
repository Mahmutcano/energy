import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/device-categories', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getCategories);
router.post('/device-categories', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createCategory);
router.patch('/device-categories/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateCategory);
router.delete('/device-categories/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteCategory);

export default router;
