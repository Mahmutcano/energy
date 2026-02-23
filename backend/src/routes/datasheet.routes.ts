import { Router } from 'express';
import { getDataSheets, createDataSheet, updateDataSheet, deleteDataSheet } from '../controllers/datasheet.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/datasheets', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getDataSheets);
router.post('/datasheets', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createDataSheet);
router.patch('/datasheets/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateDataSheet);
router.delete('/datasheets/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteDataSheet);

export default router;
