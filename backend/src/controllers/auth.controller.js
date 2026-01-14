import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateToken } from '../utils/jwt.js';

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario (solo ADMIN puede crear usuarios)
 * @access  Private (Admin)
 */
export const register = async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        // Validar campos requeridos
        if (!email || !password || !name || !role) {
            return res.status(400).json({
                error: 'Campos incompletos',
                message: 'Email, contraseña, nombre y rol son requeridos'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'Usuario ya existe',
                message: 'Ya existe un usuario con ese email'
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user
        });

    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo crear el usuario'
        });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            return res.status(400).json({
                error: 'Campos incompletos',
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                message: 'Email o contraseña incorrectos'
            });
        }

        // Generar token JWT
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Enviar token en cookie (httpOnly para seguridad)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        // Responder con datos del usuario y token
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo iniciar sesión'
        });
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
export const logout = async (req, res) => {
    try {
        // Limpiar cookie
        res.clearCookie('token');

        res.json({
            message: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo cerrar sesión'
        });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Obtener usuario autenticado
 * @access  Private
 */
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                message: 'El usuario no existe'
            });
        }

        res.json({ user });

    } catch (error) {
        console.error('Error en getMe:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo obtener la información del usuario'
        });
    }
};
