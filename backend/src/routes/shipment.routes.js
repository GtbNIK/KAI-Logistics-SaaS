import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { enforcePlanLimits } from '../middleware/enforcePlanLimits.js';
import {
    getShipments,
    getShipment,
    createShipment,
    updateShipment,
    deleteShipment,
    getMonthlyClose
} from '../controllers/shipment.controller.js';

const router = Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.get('/', getShipments);
router.get('/monthly-close', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getMonthlyClose);
router.get('/:id', getShipment);
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), enforcePlanLimits('shipmentsActive'), createShipment);
router.put('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), updateShipment);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteShipment);

export default router;
