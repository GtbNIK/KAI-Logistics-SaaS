import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getAirLines,
    createAirLine,
    updateAirLine,
    toggleAirLineStatus,
    deleteAirLine
} from '../controllers/airline.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', authorize('ADMIN', 'SALES'), getAirLines);
router.post('/', authorize('ADMIN', 'SALES'), createAirLine);
router.put('/:id', authorize('ADMIN'), updateAirLine);
router.patch('/:id/toggle-status', authorize('ADMIN'), toggleAirLineStatus);
router.delete('/:id', authorize('ADMIN'), deleteAirLine);

export default router;
