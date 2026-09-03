import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';
import {
    getAirLines,
    createAirLine,
    updateAirLine,
    toggleAirLineStatus,
    deleteAirLine
} from '../controllers/airline.controller.js';

const router = Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getAirLines);
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), createAirLine);
router.put('/:id', authorize('OWNER', 'ADMIN'), updateAirLine);
router.patch('/:id/toggle-status', authorize('OWNER', 'ADMIN'), toggleAirLineStatus);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteAirLine);

export default router;
