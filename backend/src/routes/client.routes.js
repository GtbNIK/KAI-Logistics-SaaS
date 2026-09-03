import express from 'express';
import {
    createClient,
    getClients,
    getClient,
    updateClient,
    deleteClient,
    toggleClientStatus,
    getClientReceivablesSummary,
} from '../controllers/client.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Todas las rutas de clientes requieren:
 * 1. verifyToken (JWT valido)
 * 2. tenantResolver (lee X-Tenant-Slug)
 * 3. requireMembership (user pertenece al tenant)
 */
router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

/**
 * @route   POST /api/clients
 * @desc    Crear cliente en el tenant activo
 * @access  ADMIN, SALES, OPERATOR
 */
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), createClient);

/**
 * @route   GET /api/clients
 * @desc    Listar clientes del tenant activo
 * @access  Todos los miembros del tenant
 */
router.get('/', getClients);

/**
 * @route   GET /api/clients/:id/receivables-summary
 * @desc    Resumen de cuentas por cobrar del cliente
 * @access  Todos los miembros del tenant
 */
router.get('/:id/receivables-summary', getClientReceivablesSummary);

/**
 * @route   GET /api/clients/:id
 * @desc    Obtener un cliente por ID
 * @access  Todos los miembros del tenant
 */
router.get('/:id', getClient);

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualizar cliente
 * @access  OWNER, ADMIN, SALES, OPERATOR
 */
router.put('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), updateClient);

/**
 * @route   PATCH /api/clients/:id/toggle-status
 * @desc    Activar/inactivar cliente
 * @access  OWNER, ADMIN, SALES, OPERATOR
 */
router.patch('/:id/toggle-status', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), toggleClientStatus);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Eliminar (soft) cliente
 * @access  OWNER, ADMIN
 */
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteClient);

export default router;
