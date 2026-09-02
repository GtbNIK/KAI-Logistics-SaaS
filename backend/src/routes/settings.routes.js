import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import upload from '../config/upload.js';

const router = Router();

// Cross-check: el tenant del header debe coincidir con el del JWT (evita fugas multi-tenant)
router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.get('/', getSettings);

router.put(
    '/',
    authorize('OWNER', 'ADMIN'),
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'quoteBg', maxCount: 1 },
        { name: 'noticeBg', maxCount: 1 },
        { name: 'deliveryNoteBg', maxCount: 1 },
        { name: 'receiptBg', maxCount: 1 },
        { name: 'rateBg', maxCount: 1 }
    ]),
    updateSettings
);

export default router;
