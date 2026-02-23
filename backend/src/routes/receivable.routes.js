import express from 'express';
import {
    getReceivables,
    getReceivableById,
    registerPayment
} from '../controllers/receivable.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

/**
 * @route   GET /api/receivables
 * @desc    Obtener lista de cuentas por cobrar
 * @access  Private
 */
router.get('/', getReceivables);

/**
 * @route   GET /api/receivables/:id
 * @desc    Obtener detalles de cuenta por cobrar
 * @access  Private
 */
router.get('/:id', getReceivableById);

/**
 * @route   POST /api/receivables/:id/payments
 * @desc    Registrar un pago a una cuenta por cobrar
 * @access  Private (idealmente admin o ventas con permisos)
 */
router.post('/:id/payments', registerPayment);

export default router;
