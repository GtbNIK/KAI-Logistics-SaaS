/**
 * requireSuperAdmin - Middleware de autenticacion para rutas /api/admin/*.
 *
 * Valida que el request venga de un SuperAdmin activo.
 * Lee el JWT desde cookie `admin_token` o header Authorization: Bearer.
 *
 * El JWT de SuperAdmin tiene la forma:
 *   { id: '...', email: '...', type: 'super_admin' }
 *
 * IMPORTANTE: Este middleware es INDEPENDIENTE del tenant.
 * Los super-admins NO pertenecen a ningun tenant.
 */

import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

const extractAdminToken = (req) => {
    const cookieToken = req.cookies?.admin_token;
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
};

export const requireSuperAdmin = async (req, res, next) => {
    try {
        const token = extractAdminToken(req);

        if (!token) {
            return res.status(401).json({
                message: 'No autenticado como super-admin.',
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                message: 'Token de super-admin inválido o expirado.',
            });
        }

        if (decoded.type !== 'super_admin' || !decoded.id) {
            return res.status(403).json({
                message: 'Token no válido para super-admin.',
            });
        }

        const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                totpEnabled: true,
            },
        });

        if (!superAdmin) {
            return res.status(401).json({
                message: 'Super-admin no encontrado.',
            });
        }

        if (!superAdmin.isActive) {
            return res.status(403).json({
                message: 'Super-admin inactivo.',
            });
        }

        // Si tiene TOTP habilitado, exigir que el token haya sido validado con TOTP
        if (superAdmin.totpEnabled && !decoded.totpVerified) {
            return res.status(403).json({
                message: 'Se requiere código TOTP.',
                requiresTotp: true,
            });
        }

        req.superAdmin = superAdmin;
        return next();
    } catch (error) {
        console.error('[requireSuperAdmin] Error:', error);
        return res.status(500).json({
            message: 'Error al validar super-admin.',
        });
    }
};
