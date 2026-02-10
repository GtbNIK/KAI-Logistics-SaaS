import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Obtener configuración (cualquier usuario autenticado puede ver)
router.get('/', verifyToken, getSettings);

// Actualizar configuración (solo admin)
router.put('/', verifyToken, authorize('ADMIN'), updateSettings);

export default router;
