import express from 'express';
import {
    getDeliveryNotes,
    getDeliveryNoteById,
    createDeliveryNote,
    updateDeliveryNote,
    updateDeliveryNoteStatus,
    deleteDeliveryNote
} from '../controllers/delivery-note.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * @route   POST /api/delivery-notes
 * @desc    Crear nueva nota de entrega
 */
router.post('/', authorize('ADMIN', 'SALES'), createDeliveryNote);

/**
 * @route   GET /api/delivery-notes
 * @desc    Listar notas de entrega (paginado)
 */
router.get('/', authorize('ADMIN', 'SALES'), getDeliveryNotes);

/**
 * @route   GET /api/delivery-notes/:id
 * @desc    Obtener detalle de una nota de entrega
 */
router.get('/:id', authorize('ADMIN', 'SALES'), getDeliveryNoteById);

/**
 * @route   PUT /api/delivery-notes/:id
 * @desc    Actualizar nota de entrega (solo DRAFT)
 */
router.put('/:id', authorize('ADMIN', 'SALES'), updateDeliveryNote);

/**
 * @route   PATCH /api/delivery-notes/:id/status
 * @desc    Cambiar estado de la nota
 */
router.patch('/:id/status', authorize('ADMIN', 'SALES'), updateDeliveryNoteStatus);

/**
 * @route   DELETE /api/delivery-notes/:id
 * @desc    Soft delete de nota de entrega
 */
router.delete('/:id', authorize('ADMIN'), deleteDeliveryNote);

export default router;
