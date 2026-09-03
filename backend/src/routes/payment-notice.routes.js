import express from 'express';
import {
    convertFromQuote,
    createPaymentNotice,
    updatePaymentNotice,
    getPaymentNotices,
    getPaymentNoticeById,
    deletePaymentNotice
} from '../controllers/payment-notice.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { enforcePlanLimits } from '../middleware/enforcePlanLimits.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.post('/from-quote/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), convertFromQuote);
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), enforcePlanLimits('documentsMonth'), createPaymentNotice);
router.get('/', getPaymentNotices);
router.get('/:id', getPaymentNoticeById);
router.put('/:id', authorize('OWNER', 'ADMIN'), updatePaymentNotice);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deletePaymentNotice);

export default router;
