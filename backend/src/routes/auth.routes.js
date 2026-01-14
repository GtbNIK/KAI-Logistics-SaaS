import express from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Private (Solo Admin)
 */
router.post('/register', verifyToken, authorize('ADMIN'), register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener usuario autenticado
 * @access  Private
 */
router.get('/me', verifyToken, getMe);

export default router;
