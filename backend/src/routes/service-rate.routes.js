import express from 'express';
import * as rateController from '../controllers/service-rate.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Buscar tarifa específica (usado por el cotizador)
router.get('/find', authorize('ADMIN', 'SALES'), rateController.findRate);

// Listar todas las tarifas (administración)
router.get('/', authorize('ADMIN', 'SALES'), rateController.getRates);

export default router;
