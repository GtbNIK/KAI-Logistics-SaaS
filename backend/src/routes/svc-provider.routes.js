import express from 'express';
import { authorize } from '../middleware/auth.middleware.js';
import { getSvcProviders, createSvcProvider } from '../controllers/svc-provider.controller.js';

const router = express.Router();

router.get('/', authorize('ADMIN', 'SALES'), getSvcProviders);
router.post('/', authorize('ADMIN'), createSvcProvider);

export default router;
