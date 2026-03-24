import express from 'express';
import {
	createPort,
	getPorts,
	getPort,
	updatePort,
	deletePort,
	togglePortStatus
} from '../controllers/port.controller.js';
import { authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authorize('ADMIN'), createPort);
router.get('/', authorize('ADMIN', 'SALES'), getPorts);
router.get('/:id', authorize('ADMIN', 'SALES'), getPort);
router.put('/:id', authorize('ADMIN'), updatePort);
router.delete('/:id', authorize('ADMIN'), deletePort);
router.patch('/:id/toggle', authorize('ADMIN'), togglePortStatus);

export default router;
