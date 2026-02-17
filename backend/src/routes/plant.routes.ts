import { Router } from 'express';
import { getPlants, createPlant, updatePlant, deletePlant } from '../controllers/plant.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/plants', authenticate, authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getPlants);
router.post('/plants', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), createPlant);
router.patch('/plants/:id', authenticate, authorize(['SUPER_ADMIN', 'ADMIN']), updatePlant);
router.delete('/plants/:id', authenticate, authorize(['SUPER_ADMIN']), deletePlant);

export default router;
