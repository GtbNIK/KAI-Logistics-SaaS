import { verifyToken } from '../utils/jwt.js';

/**
 * Middleware de autenticación
 * Verifica que el usuario tenga un token válido
 */
export const authenticate = (req, res, next) => {
    try {
        // Buscar token en header Authorization o en cookies
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        
        if (!token) {
            return res.status(401).json({
                error: 'No autorizado',
                message: 'Token no proporcionado'
            });
        }

        // Verificar y decodificar token
        const decoded = verifyToken(token);
        req.user = decoded; // Adjuntar info del usuario al request
        
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'No autorizado',
            message: error.message
        });
    }
};

/**
 * Middleware para verificar roles específicos
 * @param  {...string} allowedRoles - Roles permitidos (ej: 'ADMIN', 'SALES')
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'No autorizado',
                message: 'Usuario no autenticado'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Prohibido',
                message: 'No tienes permisos para acceder a este recurso'
            });
        }

        next();
    };
};
