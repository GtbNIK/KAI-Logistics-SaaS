import express from 'express';
import {
    createReceivable,
    getReceivables,
    getReceivableById,
    registerPayment,
    deleteReceivablePayment,
    deleteReceivable
} from '../controllers/receivable.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

/**
 * @route   POST /api/receivables
 * @desc    Crear una cuenta por cobrar manual
 * @access  Private (ADMIN)
 */
router.post('/', authorize('ADMIN'), createReceivable);

/**
 * @route   GET /api/receivables
 * @desc    Obtener lista de cuentas por cobrar
 * @access  Private
 */
router.get('/', authorize('ADMIN'), getReceivables);

/**
 * @route   GET /api/receivables/:id
 * @desc    Obtener detalles de cuenta por cobrar
 * @access  Private
 */
router.get('/:id', authorize('ADMIN'), getReceivableById);

/**
 * @route   POST /api/receivables/:id/payments
 * @desc    Registrar un pago a una cuenta por cobrar
 * @access  Private (idealmente admin o ventas con permisos)
 */
router.post('/:id/payments', authorize('ADMIN'), registerPayment);

/**
 * @route   DELETE /api/receivables/:id/payments/:paymentId
 * @desc    Eliminar un pago específico de una cuenta por cobrar
 * @access  Private (ADMIN)
 */
router.delete('/:id/payments/:paymentId', authorize('ADMIN'), deleteReceivablePayment);

/**
 * @route   DELETE /api/receivables/:id
 * @desc    Eliminar una cuenta por cobrar y sus pagos asociados
 * @access  Private (ADMIN)
 */
router.delete('/:id', authorize('ADMIN'), deleteReceivable);

export default router;
