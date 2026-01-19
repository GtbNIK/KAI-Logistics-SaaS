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
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ============ CATÁLOGOS (para dropdowns) ============
router.get('/catalogs/zones', authorize('ADMIN', 'SALES'), getZones);
router.get('/catalogs/services', authorize('ADMIN', 'SALES'), getServices);

// ============ ALIADOS CRUD ============

/**
 * @route   POST /api/allies
 * @desc    Crear nuevo aliado
 * @access  Private (Admin)
 */
router.post('/', authorize('ADMIN'), createAlly);

/**
 * @route   GET /api/allies
 * @desc    Obtener lista de aliados (con paginación y búsqueda)
 * @access  Private (Admin, Sales)
 */
router.get('/', authorize('ADMIN', 'SALES'), getAllies);

/**
 * @route   GET /api/allies/:id
 * @desc    Obtener un aliado por ID
 * @access  Private (Admin, Sales)
 */
router.get('/:id', authorize('ADMIN', 'SALES'), getAlly);

/**
 * @route   PUT /api/allies/:id
 * @desc    Actualizar aliado
 * @access  Private (Admin)
 */
router.put('/:id', authorize('ADMIN'), updateAlly);

/**
 * @route   PATCH /api/allies/:id/toggle-status
 * @desc    Activar/Desactivar aliado
 * @access  Private (Admin)
 */
router.patch('/:id/toggle-status', authorize('ADMIN'), toggleAllyStatus);

/**
 * @route   DELETE /api/allies/:id
 * @desc    Eliminar aliado (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('ADMIN'), deleteAlly);

// ============ TARIFAS DE ALIADO ============

/**
 * @route   GET /api/allies/:id/rates
 * @desc    Obtener tarifas de un aliado
 * @access  Private (Admin, Sales)
 */
router.get('/:id/rates', authorize('ADMIN', 'SALES'), getAllyRates);

/**
 * @route   POST /api/allies/:id/rates
 * @desc    Crear/actualizar tarifa para un aliado
 * @access  Private (Admin)
 */
router.post('/:id/rates', authorize('ADMIN'), upsertAllyRate);

/**
 * @route   DELETE /api/allies/:id/rates/:rateId
 * @desc    Eliminar tarifa
 * @access  Private (Admin)
 */
router.delete('/:id/rates/:rateId', authorize('ADMIN'), deleteAllyRate);

export default router;
