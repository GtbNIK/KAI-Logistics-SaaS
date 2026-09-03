import express from 'express';
import * as rateController from '../controllers/rate.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

// Listar tarifas con filtros y paginación
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.getRates);

// Listar tarifas expiradas
router.get('/expired', authorize('OWNER', 'ADMIN'), rateController.getExpiredRates);

// Buscar tarifa activa exacta (para cotizaciones)
router.get('/find', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.findRate);

// Obtener tarifas por entidad (para modales de detalle)
router.get('/by-ally/:allyId', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.getRatesByAlly);
router.get('/by-port/:portId', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.getRatesByPort);
router.get('/by-shipping-line/:shippingLineId', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.getRatesByShippingLine);

// Activación masiva (solo ADMIN)
router.patch('/bulk-activate', authorize('OWNER', 'ADMIN'), rateController.bulkActivate);
router.patch('/bulk-deactivate', authorize('OWNER', 'ADMIN'), rateController.bulkDeactivate);

// Toggle activación individual (solo ADMIN)
router.patch('/:id/toggle-active', authorize('OWNER', 'ADMIN'), rateController.toggleActive);

// Crear tarifa (solo ADMIN)
router.post('/', authorize('OWNER', 'ADMIN'), rateController.createRate);

// Actualizar tarifa (solo ADMIN)
router.put('/:id', authorize('OWNER', 'ADMIN'), rateController.updateRate);

// Soft delete tarifa (solo ADMIN)
router.delete('/:id', authorize('OWNER', 'ADMIN'), rateController.deleteRate);

export default router;
