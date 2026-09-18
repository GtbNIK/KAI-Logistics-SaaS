import express from 'express';
import {
    createReceivable,
    getReceivables,
    getReceivableById,
    registerPayment,
    deleteReceivablePayment,
    deleteReceivable,
    updateReceivable
} from '../controllers/receivable.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.post('/', authorize('OWNER', 'ADMIN'), createReceivable);
router.get('/', authorize('OWNER', 'ADMIN'), getReceivables);
router.get('/:id', authorize('OWNER', 'ADMIN'), getReceivableById);
router.put('/:id', authorize('OWNER', 'ADMIN'), updateReceivable);
router.post('/:id/payments', authorize('OWNER', 'ADMIN'), registerPayment);
router.delete('/:id/payments/:paymentId', authorize('OWNER', 'ADMIN'), deleteReceivablePayment);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteReceivable);

export default router;
