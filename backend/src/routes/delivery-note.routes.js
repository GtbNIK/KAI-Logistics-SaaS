import express from 'express';
import {
    getDeliveryNotes,
    getDeliveryNoteById,
    createDeliveryNote,
    updateDeliveryNote,
    updateDeliveryNoteStatus,
    deleteDeliveryNote
} from '../controllers/delivery-note.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), createDeliveryNote);
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getDeliveryNotes);
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getDeliveryNoteById);
router.put('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), updateDeliveryNote);
router.patch('/:id/status', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), updateDeliveryNoteStatus);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deleteDeliveryNote);

export default router;
