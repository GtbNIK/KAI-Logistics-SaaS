import express from 'express';
import * as rateController from '../controllers/rate.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Listar tarifas con filtros y paginación
router.get('/', authorize('ADMIN', 'SALES'), rateController.getRates);

// Listar tarifas expiradas
router.get('/expired', authorize('ADMIN'), rateController.getExpiredRates);

// Crear tarifa (solo ADMIN)
router.post('/', authorize('ADMIN'), rateController.createRate);

// Actualizar tarifa (solo ADMIN)
router.put('/:id', authorize('ADMIN'), rateController.updateRate);

// Soft delete tarifa (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), rateController.deleteRate);

export default router;
