import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getPayables,
    getPayableById,
    createPayable,
    registerPayablePayment,
    deletePayable,
    deletePayablePayment
} from '../controllers/payable.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize('ADMIN'), getPayables);
router.get('/:id', authorize('ADMIN'), getPayableById);
router.post('/', authorize('ADMIN'), createPayable);
router.post('/:id/payments', authorize('ADMIN'), registerPayablePayment);
router.delete('/:id/payments/:paymentId', authorize('ADMIN'), deletePayablePayment);
router.delete('/:id', authorize('ADMIN'), deletePayable);

export default router;
