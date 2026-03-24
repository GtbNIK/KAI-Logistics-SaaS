import express from 'express';
import {
    convertFromQuote,
    createPaymentNotice,
    getPaymentNotices,
    getPaymentNoticeById
} from '../controllers/payment-notice.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas las rutas de ventas/facturación requieren autenticación
router.use(verifyToken);

/**
 * @route   POST /api/payment-notices/from-quote/:id
 * @desc    Convertir cotización en Aviso de Cobro
 * @access  Private
 */
router.post('/from-quote/:id', authorize('ADMIN', 'SALES'), convertFromQuote);

/**
 * @route   POST /api/payment-notices
 * @desc    Crear un Aviso de Cobro directamente (sin cotización)
 * @access  Private
 */
router.post('/', authorize('ADMIN', 'SALES'), createPaymentNotice);

/**
 * @route   GET /api/payment-notices
 * @desc    Obtener lista de avisos de cobro
 * @access  Private
 */
router.get('/', getPaymentNotices);

/**
 * @route   GET /api/payment-notices/:id
 * @desc    Obtener un aviso de cobro específico
 * @access  Private
 */
router.get('/:id', getPaymentNoticeById);

export default router;
