import { Router } from 'express';
import { getPlants, createPlant, updatePlant, deletePlant } from '../controllers/plant.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/plants', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN', 'NORMAL_USER']), getPlants);
router.post('/plants', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), createPlant);
router.patch('/plants/:id', authenticate, authorize(['SUPER_ADMIN', 'COMPANY_ADMIN']), updatePlant);
router.delete('/plants/:id', authenticate, authorize(['SUPER_ADMIN']), deletePlant);

export default router;
