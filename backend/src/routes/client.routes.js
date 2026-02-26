import express from 'express';
import * as clientController from '../controllers/client.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken); // Todas las rutas requieren autenticación

router.post('/', authorize('ADMIN', 'SALES'), clientController.createClient);
router.get('/', authorize('ADMIN', 'SALES'), clientController.getClients);
// Ruta específica ANTES de /:id para evitar conflictos
router.get('/:id/receivables-summary', authorize('ADMIN', 'SALES'), clientController.getClientReceivablesSummary);
router.get('/:id', authorize('ADMIN', 'SALES'), clientController.getClient);
router.put('/:id', authorize('ADMIN', 'SALES'), clientController.updateClient);
router.patch('/:id/toggle-status', authorize('ADMIN', 'SALES'), clientController.toggleClientStatus);
router.delete('/:id', authorize('ADMIN'), clientController.deleteClient); // Solo Admin borra

export default router;

