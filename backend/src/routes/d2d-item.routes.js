import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { getD2DItems, createD2DItem } from '../controllers/d2d-item.controller.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getD2DItems);
router.post('/', authorize('OWNER', 'ADMIN'), createD2DItem);

export default router;
