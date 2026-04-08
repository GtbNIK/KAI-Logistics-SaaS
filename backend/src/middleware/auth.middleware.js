import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Asignamos directamente la data del token para no saturar el pool de conexiones de la BD
        req.user = decoded;
        
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: 'No tienes permisos para acceder a este recurso' 
            });
        }

        next();
    };
};
