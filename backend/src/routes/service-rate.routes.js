import express from 'express';
import * as rateController from '../controllers/service-rate.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

// Buscar tarifa específica (usado por el cotizador)
router.get('/find', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.findRate);

// Listar todas las tarifas (administración)
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), rateController.getRates);

export default router;
