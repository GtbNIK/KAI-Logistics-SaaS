import express from 'express';
import * as rateController from '../controllers/rate.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Listar tarifas con filtros y paginación
router.get('/', authorize('ADMIN', 'SALES'), rateController.getRates);

// Listar tarifas expiradas
router.get('/expired', authorize('ADMIN'), rateController.getExpiredRates);

// Buscar tarifa activa exacta (para cotizaciones)
router.get('/find', authorize('ADMIN', 'SALES'), rateController.findRate);

// Obtener tarifas por entidad (para modales de detalle)
router.get('/by-ally/:allyId', authorize('ADMIN', 'SALES'), rateController.getRatesByAlly);
router.get('/by-port/:portId', authorize('ADMIN', 'SALES'), rateController.getRatesByPort);
router.get('/by-shipping-line/:shippingLineId', authorize('ADMIN', 'SALES'), rateController.getRatesByShippingLine);

// Activación masiva (solo ADMIN)
router.patch('/bulk-activate', authorize('ADMIN'), rateController.bulkActivate);
router.patch('/bulk-deactivate', authorize('ADMIN'), rateController.bulkDeactivate);

// Toggle activación individual (solo ADMIN)
router.patch('/:id/toggle-active', authorize('ADMIN'), rateController.toggleActive);

// Crear tarifa (solo ADMIN)
router.post('/', authorize('ADMIN'), rateController.createRate);

// Actualizar tarifa (solo ADMIN)
router.put('/:id', authorize('ADMIN'), rateController.updateRate);

// Soft delete tarifa (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), rateController.deleteRate);

export default router;
