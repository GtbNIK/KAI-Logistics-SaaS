import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getUnreadNotifications,
    markAsRead,
    markAllAsRead
} from '../controllers/notification.controller.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.use(verifyToken);

// Notificaciones son por usuario, pero ambos roles pueden leerlas
router.get('/unread', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), getUnreadNotifications);
router.put('/mark-all-read', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), markAllAsRead);
router.put('/:id/read', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), markAsRead);

export default router;
