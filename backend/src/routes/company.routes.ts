import { Router } from 'express';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../controllers/company.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/companies', authenticate, getCompanies);
router.post('/companies', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createCompany);
router.patch('/companies/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateCompany);
router.delete('/companies/:id', authenticate, authorize(['SUPER_ADMIN']), deleteCompany);

export default router;
