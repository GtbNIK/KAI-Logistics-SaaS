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
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

/**
 * @route   GET /api/services/types
 * @desc    Obtener tipos de servicio (para dropdown)
 * @access  Private
 */
router.get('/types', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getServiceTypes);

/**
 * @route   POST /api/services
 * @desc    Crear nuevo servicio
 * @access  Private (Admin)
 */
router.post('/', authorize('OWNER', 'ADMIN'), createService);

/**
 * @route   GET /api/services
 * @desc    Obtener lista de servicios
 * @access  Private
 */
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getServices);

/**
 * @route   GET /api/services/:id
 * @desc    Obtener un servicio por ID
 * @access  Private
 */
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getService);

/**
 * @route   PUT /api/services/:id
 * @desc    Actualizar servicio
 * @access  Private (Admin)
 */
router.put('/:id', authorize('OWNER', 'ADMIN'), updateService);

/**
 * @route   DELETE /api/services/:id
 * @desc    Eliminar (desactivar) servicio
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteService);

/**
 * @route   PATCH /api/services/:id/toggle
 * @desc    Activar/Desactivar servicio
 * @access  Private (Admin)
 */
router.patch('/:id/toggle', authorize('OWNER', 'ADMIN'), toggleServiceStatus);

export default router;
