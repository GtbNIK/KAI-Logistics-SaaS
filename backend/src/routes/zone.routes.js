import express from 'express';
import { 
    createZone, 
    getZones, 
    getZone, 
    updateZone, 
    deleteZone,
    toggleZoneStatus
} from '../controllers/zone.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

/**
 * @route   POST /api/zones
 * @desc    Crear nueva zona
 * @access  Private (Admin)
 */
router.post('/', authorize('OWNER', 'ADMIN'), createZone);

/**
 * @route   GET /api/zones
 * @desc    Obtener lista de zonas
 * @access  Private
 */
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getZones);

/**
 * @route   GET /api/zones/:id
 * @desc    Obtener una zona por ID
 * @access  Private
 */
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getZone);

/**
 * @route   PUT /api/zones/:id
 * @desc    Actualizar zona
 * @access  Private (Admin)
 */
router.put('/:id', authorize('OWNER', 'ADMIN'), updateZone);

/**
 * @route   DELETE /api/zones/:id
 * @desc    Eliminar (desactivar) zona
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteZone);

/**
 * @route   PATCH /api/zones/:id/toggle
 * @desc    Activar/Desactivar zona
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', authorize('OWNER', 'ADMIN'), toggleZoneStatus);

export default router;
