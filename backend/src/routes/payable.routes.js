import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getPayables,
    getPayableById,
    createPayable,
    updatePayable,
    registerPayablePayment,
    deletePayable,
    deletePayablePayment
} from '../controllers/payable.controller.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.use(verifyToken);

router.get('/', authorize('OWNER', 'ADMIN'), getPayables);
router.get('/:id', authorize('OWNER', 'ADMIN'), getPayableById);
router.post('/', authorize('OWNER', 'ADMIN'), createPayable);
router.put('/:id', authorize('OWNER', 'ADMIN'), updatePayable);
router.post('/:id/payments', authorize('OWNER', 'ADMIN'), registerPayablePayment);
router.delete('/:id/payments/:paymentId', authorize('OWNER', 'ADMIN'), deletePayablePayment);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deletePayable);

export default router;
