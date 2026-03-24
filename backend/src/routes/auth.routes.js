import express from 'express';
import { register, login, logout, getMe, getUsers, updateUser, deleteUser, resetPassword } from '../controllers/auth.controller.js';
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

// Actualizar usuario
router.put('/users/:id', verifyToken, authorize('ADMIN'), updateUser);

// Eliminar usuario
router.delete('/users/:id', verifyToken, authorize('ADMIN'), deleteUser);

// Resetear contraseña
router.post('/users/:id/reset-password', verifyToken, authorize('ADMIN'), resetPassword);

/**
 * @route   GET /api/auth/users
 * @desc    Obtener lista de usuarios
 * @access  Private (Admin, Sales)
 */
router.get('/users', verifyToken, authorize('ADMIN', 'SALES'), getUsers);

export default router;
