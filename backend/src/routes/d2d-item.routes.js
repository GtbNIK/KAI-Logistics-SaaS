import express from 'express';
import { authorize } from '../middleware/auth.middleware.js';
import { getD2DItems, createD2DItem } from '../controllers/d2d-item.controller.js';

const router = express.Router();

router.get('/', authorize('ADMIN', 'SALES'), getD2DItems);
router.post('/', authorize('ADMIN'), createD2DItem);

export default router;
