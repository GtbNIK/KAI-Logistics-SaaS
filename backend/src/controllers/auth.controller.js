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

        // Verificar si el usuario está activo
        if (!user.isActive) {
            return res.status(403).json({
                error: 'Cuenta desactivada',
                message: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
            });
        }

        // Generar token JWT
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        // Enviar token en cookie (httpOnly para seguridad)
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict',
            maxAge: 60 * 60 * 1000 // 1 hora
        });

        // Calcular fecha de expiración para el frontend
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        // Responder con datos del usuario y token
        res.json({
            message: 'Login exitoso',
            token,
            expiresAt,
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
        const isProduction = process.env.NODE_ENV === 'production';
        
        // Limpiar cookie con las mismas opciones que al crearla (reemplazando maxAge)
        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict'
        });

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

/**
 * @route   GET /api/auth/users
 * @desc    Obtener lista de usuarios (para filtros y asignaciones)
 * @access  Private (Admin, Sales)
 */
export const getUsers = async (req, res) => {
    try {
        const showAll = req.query.all === 'true';
        const users = await prisma.user.findMany({
            where: showAll ? {} : { isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({ users });
    } catch (error) {
        console.error('Error en getUsers:', error);
        res.status(500).json({
            error: 'Error del servidor',
            message: 'No se pudo obtener la lista de usuarios'
        });
    }
};


/**
 * @route   PUT /api/auth/users/:id
 * @desc    Actualizar usuario (Nombre, Email, Rol)
 * @access  Private (Admin)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { name, email, role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ message: 'Error al actualizar usuario' });
    }
};

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Eliminar usuario
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Evitar que el admin se elimine a sí mismo
        if (req.user.id === id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }

        // Soft delete: marcar como inactivo en lugar de eliminar físicamente
        // Esto preserva el historial de cotizaciones, envíos y demás relaciones
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await prisma.user.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ message: 'Error al desactivar usuario' });
    }
};

/**
 * @route   POST /api/auth/users/:id/reset-password
 * @desc    Resetear contraseña de usuario
 * @access  Private (Admin)
 */
export const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error al resetear contraseña' });
    }
};
