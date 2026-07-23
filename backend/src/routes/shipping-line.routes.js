import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import {
    getShippingLines,
    createShippingLine,
    updateShippingLine,
    toggleShippingLineStatus,
    deleteShippingLine
} from '../controllers/shipping-line.controller.js';

const router = Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getShippingLines);
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), createShippingLine);
router.put('/:id', authorize('OWNER', 'ADMIN'), updateShippingLine);
router.patch('/:id/toggle-status', authorize('OWNER', 'ADMIN'), toggleShippingLineStatus);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteShippingLine);

export default router;
