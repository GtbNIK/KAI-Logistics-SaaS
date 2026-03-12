import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getUnreadNotifications,
    markAsRead,
    markAllAsRead
} from '../controllers/notification.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/unread', getUnreadNotifications);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
