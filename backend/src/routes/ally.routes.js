import express from 'express';
import { 
    createAlly, 
    getAllies, 
    getAlly, 
    updateAlly, 
    deleteAlly, 
    toggleAllyStatus,
    getAllyRates,
    upsertAllyRate,
    deleteAllyRate,
    getZones,
    getServices
} from '../controllers/ally.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

// ============ CATÁLOGOS (para dropdowns) ============
router.get('/catalogs/zones', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getZones);
router.get('/catalogs/services', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getServices);

// ============ ALIADOS CRUD ============

/**
 * @route   POST /api/allies
 * @desc    Crear nuevo aliado
 * @access  Private (Admin)
 */
router.post('/', authorize('OWNER', 'ADMIN'), createAlly);

/**
 * @route   GET /api/allies
 * @desc    Obtener lista de aliados (con paginación y búsqueda)
 * @access  Private (Admin, Sales)
 */
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getAllies);

/**
 * @route   GET /api/allies/:id
 * @desc    Obtener un aliado por ID
 * @access  Private (Admin, Sales)
 */
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getAlly);

/**
 * @route   PUT /api/allies/:id
 * @desc    Actualizar aliado
 * @access  Private (Admin)
 */
router.put('/:id', authorize('OWNER', 'ADMIN'), updateAlly);

/**
 * @route   PATCH /api/allies/:id/toggle-status
 * @desc    Activar/Desactivar aliado
 * @access  Private (Admin)
 */
router.patch('/:id/toggle-status', authorize('OWNER', 'ADMIN'), toggleAllyStatus);

/**
 * @route   DELETE /api/allies/:id
 * @desc    Eliminar aliado (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteAlly);

// ============ TARIFAS DE ALIADO ============

/**
 * @route   GET /api/allies/:id/rates
 * @desc    Obtener tarifas de un aliado
 * @access  Private (Admin, Sales)
 */
router.get('/:id/rates', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getAllyRates);

/**
 * @route   POST /api/allies/:id/rates
 * @desc    Crear/actualizar tarifa para un aliado
 * @access  Private (Admin)
 */
router.post('/:id/rates', authorize('OWNER', 'ADMIN'), upsertAllyRate);

/**
 * @route   DELETE /api/allies/:id/rates/:rateId
 * @desc    Eliminar tarifa
 * @access  Private (Admin)
 */
router.delete('/:id/rates/:rateId', authorize('OWNER', 'ADMIN'), deleteAllyRate);

export default router;
