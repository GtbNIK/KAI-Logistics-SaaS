import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { getCashFlow } from '../controllers/cash-flow.controller.js';

const router = Router();

// GET /api/cash-flow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', verifyToken, authorize('ADMIN'), getCashFlow);

export default router;
