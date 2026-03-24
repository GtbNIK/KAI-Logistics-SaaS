import express from 'express';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import {
    getUnreadNotifications,
    markAsRead,
    markAllAsRead
} from '../controllers/notification.controller.js';

const router = express.Router();

router.use(verifyToken);

// Notificaciones son por usuario, pero ambos roles pueden leerlas
router.get('/unread', authorize('ADMIN', 'SALES'), getUnreadNotifications);
router.put('/mark-all-read', authorize('ADMIN', 'SALES'), markAllAsRead);
router.put('/:id/read', authorize('ADMIN', 'SALES'), markAsRead);

export default router;
