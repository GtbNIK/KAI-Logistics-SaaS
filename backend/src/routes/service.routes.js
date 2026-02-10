import express from 'express';
import { 
    createService, 
    getServices, 
    getService, 
    updateService, 
    deleteService,
    toggleServiceStatus,
    getServiceTypes
} from '../controllers/service.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/services/types
 * @desc    Obtener tipos de servicio (para dropdown)
 * @access  Private
 */
router.get('/types', authorize('ADMIN', 'SALES'), getServiceTypes);

/**
 * @route   POST /api/services
 * @desc    Crear nuevo servicio
 * @access  Private (Admin)
 */
router.post('/', authorize('ADMIN'), createService);

/**
 * @route   GET /api/services
 * @desc    Obtener lista de servicios
 * @access  Private
 */
router.get('/', authorize('ADMIN', 'SALES'), getServices);

/**
 * @route   GET /api/services/:id
 * @desc    Obtener un servicio por ID
 * @access  Private
 */
router.get('/:id', authorize('ADMIN', 'SALES'), getService);

/**
 * @route   PUT /api/services/:id
 * @desc    Actualizar servicio
 * @access  Private (Admin)
 */
router.put('/:id', authorize('ADMIN'), updateService);

/**
 * @route   DELETE /api/services/:id
 * @desc    Eliminar (desactivar) servicio
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('ADMIN'), deleteService);

/**
 * @route   PATCH /api/services/:id/toggle
 * @desc    Activar/Desactivar servicio
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', authorize('ADMIN'), toggleServiceStatus);

export default router;
