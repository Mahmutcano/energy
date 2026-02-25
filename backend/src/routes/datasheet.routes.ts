import { Router } from 'express';
import {
    getDatasheetProfiles, createDatasheetProfile, updateDatasheetProfile, deleteDatasheetProfile,
    getDatasheetPoints, createDatasheetPoint, updateDatasheetPoint, deleteDatasheetPoint, bulkCreateDatasheetPoints
} from '../controllers/datasheet.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Profiles
router.get('/datasheet-profiles', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getDatasheetProfiles);
router.post('/datasheet-profiles', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createDatasheetProfile);
router.patch('/datasheet-profiles/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateDatasheetProfile);
router.delete('/datasheet-profiles/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteDatasheetProfile);

// Points
router.get('/datasheets', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getDatasheetPoints);
router.post('/datasheets', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createDatasheetPoint);
router.post('/datasheets/bulk', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), bulkCreateDatasheetPoints);
router.patch('/datasheets/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updateDatasheetPoint);
router.delete('/datasheets/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), deleteDatasheetPoint);

export default router;
