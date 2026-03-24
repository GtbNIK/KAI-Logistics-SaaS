import express from 'express';
import { 
    createZone, 
    getZones, 
    getZone, 
    updateZone, 
    deleteZone,
    toggleZoneStatus
} from '../controllers/zone.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/zones
 * @desc    Crear nueva zona
 * @access  Private (Admin)
 */
router.post('/', authorize('ADMIN'), createZone);

/**
 * @route   GET /api/zones
 * @desc    Obtener lista de zonas
 * @access  Private
 */
router.get('/', authorize('ADMIN', 'SALES'), getZones);

/**
 * @route   GET /api/zones/:id
 * @desc    Obtener una zona por ID
 * @access  Private
 */
router.get('/:id', authorize('ADMIN', 'SALES'), getZone);

/**
 * @route   PUT /api/zones/:id
 * @desc    Actualizar zona
 * @access  Private (Admin)
 */
router.put('/:id', authorize('ADMIN'), updateZone);

/**
 * @route   DELETE /api/zones/:id
 * @desc    Eliminar (desactivar) zona
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('ADMIN'), deleteZone);

/**
 * @route   PATCH /api/zones/:id/toggle
 * @desc    Activar/Desactivar zona
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', authorize('ADMIN'), toggleZoneStatus);

export default router;
