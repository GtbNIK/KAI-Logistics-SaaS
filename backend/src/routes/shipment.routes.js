import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getShipments,
    getShipment,
    createShipment,
    updateShipment,
    deleteShipment
} from '../controllers/shipment.controller.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// CRUD
router.get('/', getShipments);
router.get('/:id', getShipment);
router.post('/', authorize('ADMIN', 'SALES'), createShipment);
router.put('/:id', authorize('ADMIN', 'SALES'), updateShipment);
router.delete('/:id', authorize('ADMIN'), deleteShipment);

export default router;
