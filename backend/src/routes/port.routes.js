import express from 'express';
import {
	createPort,
	getPorts,
	getPort,
	updatePort,
	deletePort,
	togglePortStatus
} from '../controllers/port.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.post('/', authorize('OWNER', 'ADMIN'), createPort);
router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getPorts);
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getPort);
router.put('/:id', authorize('OWNER', 'ADMIN'), updatePort);
router.delete('/:id', authorize('OWNER', 'ADMIN'), deletePort);
router.patch('/:id/toggle', authorize('OWNER', 'ADMIN'), togglePortStatus);

export default router;
