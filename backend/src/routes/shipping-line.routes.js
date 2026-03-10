import { Router } from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getShippingLines,
    createShippingLine,
    updateShippingLine,
    deleteShippingLine
} from '../controllers/shipping-line.controller.js';

const router = Router();

router.use(verifyToken);

router.get('/', authorize('ADMIN', 'SALES'), getShippingLines);
router.post('/', authorize('ADMIN', 'SALES'), createShippingLine);
router.put('/:id', authorize('ADMIN'), updateShippingLine);
router.delete('/:id', authorize('ADMIN'), deleteShippingLine);

export default router;
