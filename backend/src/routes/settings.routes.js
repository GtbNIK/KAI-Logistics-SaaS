import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import upload from '../config/upload.js';

const router = Router();

router.use(verifyToken, tenantResolver(), requireMembership);

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
