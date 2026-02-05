import { Router } from 'express';
import { getPowerPlants, createPowerPlant } from '../controllers/powerPlant.controller';
import { authorize } from '../middleware/auth';

const router = Router();

router.get('/power-plants', authorize(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']), getPowerPlants);
router.post('/power-plants', authorize(['SUPER_ADMIN', 'ADMIN']), createPowerPlant);

export default router;
