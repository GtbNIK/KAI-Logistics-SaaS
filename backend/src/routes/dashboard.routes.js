import { Router } from 'express';
import { getDashboardSummary, getMonthlyReportData } from '../controllers/dashboard.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.get('/summary', getDashboardSummary);
router.get('/monthly-report', authorize('OWNER', 'ADMIN'), getMonthlyReportData);

export default router;
