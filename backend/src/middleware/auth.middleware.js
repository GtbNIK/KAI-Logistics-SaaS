/**
 * Middleware de autenticacion JWT.
 *
 * Soporta dos tipos de token:
 * 1. Token de usuario de tenant: { id, email, type: 'user', currentTenantId? }
 * 2. Token de super-admin: { id, email, type: 'super_admin' } (manejado por requireSuperAdmin)
 *
 * Lee el token desde cookie `token` o header Authorization: Bearer.
 *
 * NOTA: Este middleware solo decodifica el JWT. Para verificar que el user
 * pertenece al tenant, usar requireMembership despues.
 */

import jwt from 'jsonwebtoken';

const extractToken = (req) => {
    const cookieToken = req.cookies?.token;
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
};

export const verifyToken = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({ message: 'No autenticado.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            const message = err.name === 'TokenExpiredError'
                ? 'Sesión expirada. Por favor inicia sesión nuevamente.'
                : 'Token inválido.';
            return res.status(401).json({ message });
        }

        if (decoded.type === 'super_admin') {
            return res.status(403).json({
                message: 'Este token no es válido para rutas de tenant.',
            });
        }

        if (!decoded.id) {
            return res.status(401).json({ message: 'Token inválido.' });
        }

        req.user = {
            id: decoded.id,
            email: decoded.email,
            currentTenantId: decoded.currentTenantId || null,
        };

        return next();
    } catch (error) {
        console.error('[verifyToken] Error:', error);
        return res.status(500).json({ message: 'Error al validar la sesión.' });
    }
};

/**
 * Helper para generar JWT de usuario.
 * Incluye currentTenantId si se proporciona (para multi-tenant).
 */
export const generateUserToken = (user, currentTenantId = null) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            type: 'user',
            currentTenantId,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
};

/**
 * Helper para generar JWT de super-admin.
 * Si totpEnabled, se debe pasar totpVerified=true despues de validar el codigo.
 */
export const generateSuperAdminToken = (superAdmin, { totpVerified = false } = {}) => {
    return jwt.sign(
        {
            id: superAdmin.id,
            email: superAdmin.email,
            type: 'super_admin',
            totpVerified,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
};

/**
 * authorize - Mantenido por compatibilidad con la API legacy.
 * Ahora valida contra el rol de la Membership activa, no del User.
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.membership) {
            return res.status(401).json({ message: 'No autenticado.' });
        }

        if (!roles.includes(req.membership.role)) {
            return res.status(403).json({
                message: 'No tienes permisos para acceder a este recurso.',
            });
        }

        return next();
    };
};
