import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { getSvcProviders, createSvcProvider } from '../controllers/svc-provider.controller.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getSvcProviders);
router.post('/', authorize('OWNER', 'ADMIN'), createSvcProvider);

export default router;
