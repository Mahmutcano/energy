import { Router } from 'express';
import {
    getYtbsPlants,
    createYtbsPlant,
    deleteYtbsPlant,
    getYtbsStats,
    triggerYtbsSync,
    queryExternalPlants,
    importExternalPlants,
    removeExternalPlant,
    getImportedIds,
    getProductionLogs,
    deleteProductionLog
} from '../controllers/ytbs.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate as any);
router.use(authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']) as any);

router.get('/plants', getYtbsPlants);
router.post('/plants', createYtbsPlant);
router.delete('/plants/:id', deleteYtbsPlant);

router.get('/stats', getYtbsStats);
router.post('/sync', triggerYtbsSync);
router.post('/query-external', queryExternalPlants);
router.post('/import-external', importExternalPlants);
router.post('/remove-external', removeExternalPlant);
router.get('/imported-ids', getImportedIds);

router.get('/logs', getProductionLogs);
router.delete('/logs/:type/:id', deleteProductionLog);

export default router;
