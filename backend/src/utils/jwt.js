import jwt from 'jsonwebtoken';

/**
 * Genera un JWT token
 * @param {Object} payload - Datos a incluir en el token (ej: userId, role)
 * @returns {string} Token JWT
 */
export const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * Verifica un JWT token
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido o expirado');
    }
};
