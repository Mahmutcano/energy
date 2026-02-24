import { Router } from 'express';
import { getSchemaStats } from '../controllers/system.controller';

const router = Router();

router.get('/schema-stats', getSchemaStats);

export default router;
