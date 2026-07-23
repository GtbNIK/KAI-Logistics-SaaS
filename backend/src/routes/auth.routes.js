import express from 'express';
import {
    signup,
    login,
    refreshSession,
    logout,
    getMe,
    switchTenant,
    register,
    getUsers,
    updateUser,
    deleteUser,
    resetPassword,
} from '../controllers/auth.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';
import { enforcePlanLimits } from '../middleware/enforcePlanLimits.js';

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
 * @route   POST /api/auth/refresh
 * @desc    Extender sesion (nuevo JWT con 1h mas)
 * @access  Private
 */
router.post('/refresh', verifyToken, refreshSession);

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

/**
 * @route   GET /api/auth/users
 * @desc    Lista de usuarios del tenant activo
 * @access  Private (OWNER, ADMIN)
 */
router.get('/users', verifyToken, tenantResolver(), requireMembership, authorize('OWNER', 'ADMIN'), getUsers);

/**
 * @route   POST /api/auth/register
 * @desc    Crear usuario dentro del tenant activo
 * @access  Private (OWNER)
 */
router.post('/register', verifyToken, tenantResolver(), requireMembership, authorize('OWNER'), enforcePlanLimits('users'), register);

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Actualizar datos de un usuario
 * @access  Private (OWNER)
 */
router.put('/users/:id', verifyToken, tenantResolver(), requireMembership, authorize('OWNER'), updateUser);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Desactivar usuario
 * @access  Private (OWNER)
 */
router.delete('/users/:id', verifyToken, tenantResolver(), requireMembership, authorize('OWNER'), deleteUser);

/**
 * @route   POST /api/auth/users/:id/reset-password
 * @desc    Resetear contraseña de un usuario
 * @access  Private (OWNER)
 */
router.post('/users/:id/reset-password', verifyToken, tenantResolver(), requireMembership, authorize('OWNER'), resetPassword);

export default router;
