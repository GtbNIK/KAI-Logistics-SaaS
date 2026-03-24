import { Router } from 'express';
import { getDashboardSummary, getMonthlyReportData } from '../controllers/dashboard.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(verifyToken); // Todas las rutas protegidas

router.get('/summary', getDashboardSummary);
router.get('/monthly-report', authorize('ADMIN'), getMonthlyReportData);

export default router;
