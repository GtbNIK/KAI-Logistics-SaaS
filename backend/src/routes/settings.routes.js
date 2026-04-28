import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import upload from '../config/upload.js';

const router = Router();

// Obtener configuración (cualquier usuario autenticado puede ver)
router.get('/', verifyToken, getSettings);

// Actualizar configuración (solo admin)
// Acepta cinco archivos opcionales: quoteBg, noticeBg, deliveryNoteBg, receiptBg, rateBg.
router.put(
    '/',
    verifyToken,
    authorize('ADMIN'),
    upload.fields([
        { name: 'quoteBg', maxCount: 1 },
        { name: 'noticeBg', maxCount: 1 },
        { name: 'deliveryNoteBg', maxCount: 1 },
        { name: 'receiptBg', maxCount: 1 },
        { name: 'rateBg', maxCount: 1 }
    ]),
    updateSettings
);

export default router;
