import express from 'express';
import {
    signup,
    login,
    logout,
    getMe,
    switchTenant,
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Rutas publicas de autenticacion.
 * NO requieren tenantResolver ni requireMembership.
 */

/**
 * @route   POST /api/auth/signup
 * @desc    Crear cuenta nueva de tenant (User + Tenant + Membership + Subscription + Settings)
 * @access  Public
 */
router.post('/signup', signup);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesion
 * @access  Public
 */
router.post('/login', login);

/**
 * Rutas privadas (requieren JWT).
 */

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesion
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Info del usuario actual + memberships + tenant activo
 * @access  Private
 */
router.get('/me', verifyToken, getMe);

/**
 * @route   POST /api/auth/switch-tenant
 * @desc    Cambiar el tenant activo del usuario
 * @access  Private
 */
router.post('/switch-tenant', verifyToken, switchTenant);

export default router;
