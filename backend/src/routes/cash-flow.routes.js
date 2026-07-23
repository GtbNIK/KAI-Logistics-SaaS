import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { getCashFlow } from '../controllers/cash-flow.controller.js';

const router = Router();

router.use(verifyToken, tenantResolver(), requireMembership);

// GET /api/cash-flow?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/', verifyToken, authorize('OWNER', 'ADMIN'), getCashFlow);

export default router;
