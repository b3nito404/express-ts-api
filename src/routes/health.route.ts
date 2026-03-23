import { Router } from 'express';
import healthController from '../controllers/health.controller';

const router = Router();

router.get('/', healthController.getStatus.bind(healthController));
router.get('/live', healthController.getLiveness.bind(healthController));
router.get('/ready', healthController.getReadiness.bind(healthController));

export default router;