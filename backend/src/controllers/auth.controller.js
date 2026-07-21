import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateUserToken } from '../middleware/auth.middleware.js';
import { TRIAL_DURATION_DAYS } from '../config/plans.config.js';

/**
 * Genera un slug URL-safe a partir de un nombre.
 * Si el slug ya existe, le agrega un sufijo numerico.
 */
const generateUniqueSlug = async (baseName, tx) => {
    const slugify = (text) => {
        return text
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 40);
    };

    let baseSlug = slugify(baseName);
    if (!baseSlug) baseSlug = 'tenant';

    let slug = baseSlug;
    let counter = 1;

    while (await tx.tenant.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        if (counter > 100) {
            slug = `${baseSlug}-${Date.now().toString(36)}`;
            break;
        }
    }

    return slug;
};

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const COOKIE_OPTIONS = (isProduction) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: SESSION_MAX_AGE_MS,
});

/**
 * @route   POST /api/auth/signup
 * @desc    Crea una cuenta nueva de tenant: User + Tenant + Membership + Subscription + Settings
 * @access  Public
 *
 * Body esperado:
 * {
 *   email: 'user@empresa.com',
 *   password: 'secreto123',
 *   name: 'Nombre del usuario',
 *   companyName: 'Nombre de la empresa',
 *   phoneNumber?: '+58412...',
 *   planKey?: 'BASE' | 'PRO'  // default BASE
 * }
 *
 * Respuesta 201: User + Tenant + JWT con currentTenantId.
 */
export const signup = async (req, res) => {
    try {
        const { email, password, name, companyName, phoneNumber, planKey = 'BASE' } = req.body || {};

        if (!email || !password || !name || !companyName) {
            return res.status(400).json({
                message: 'Email, contraseña, nombre y empresa son requeridos.',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres.',
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isProduction = process.env.NODE_ENV === 'production';

        // Buscar plan (o caer a BASE si no existe)
        const plan = await prisma.plan.findUnique({ where: { key: planKey } });
        if (!plan) {
            return res.status(400).json({
                message: `Plan "${planKey}" no existe.`,
            });
        }

        // Idempotencia: si el user ya existe pero sin memberships, lo recuperamos
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { memberships: true },
        });

        if (existingUser && existingUser.memberships.length > 0) {
            return res.status(409).json({
                message: 'Ya existe un usuario con ese email.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Creamos todo en una transaccion atomica
        const result = await prisma.$transaction(async (tx) => {
            let user;

            if (existingUser) {
                // Reutilizamos el user existente (caso idempotente)
                user = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        password: hashedPassword,
                        name,
                        phoneNumber: phoneNumber || null,
                        isActive: true,
                        lastLoginAt: new Date(),
                    },
                });
            } else {
                user = await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        password: hashedPassword,
                        name,
                        phoneNumber: phoneNumber || null,
                        isActive: true,
                        lastLoginAt: new Date(),
                    },
                });
            }

            const slug = await generateUniqueSlug(companyName, tx);

            const now = new Date();
            const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
            const periodEnd = new Date(trialEndsAt);

            const tenant = await tx.tenant.create({
                data: {
                    slug,
                    name: companyName.trim(),
                    status: 'TRIAL',
                    trialEndsAt,
                    planId: plan.id,
                    createdByUserId: user.id,
                },
            });

            await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: 'TRIAL',
                    startDate: now,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextPaymentDueAt: periodEnd,
                },
            });

            await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId: tenant.id,
                    role: 'OWNER',
                    status: 'ACTIVE',
                    joinedAt: now,
                },
            });

            await tx.companySettings.create({
                data: {
                    tenantId: tenant.id,
                },
            });

            await tx.auditLog.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                    action: 'CREATE',
                    resourceType: 'TENANT',
                    resourceId: tenant.id,
                    after: { slug, name: tenant.name, planKey: plan.key },
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });

            return { user, tenant };
        });

        const token = generateUserToken(result.user, result.tenant.id);
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

        res.cookie('token', token, COOKIE_OPTIONS(isProduction));

        return res.status(201).json({
            message: 'Cuenta creada exitosamente. Tu trial de 10 días ha comenzado.',
            token,
            expiresAt,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                phoneNumber: result.user.phoneNumber,
            },
            tenant: {
                id: result.tenant.id,
                slug: result.tenant.slug,
                name: result.tenant.name,
                status: result.tenant.status,
                trialEndsAt: result.tenant.trialEndsAt,
                planKey: plan.key,
                isReadOnly: false,
            },
        });
    } catch (error) {
        console.error('[signup] Error:', error);
        return res.status(500).json({
            message: 'No se pudo crear la cuenta.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * @route   POST /api/auth/login
 * @desc    Inicia sesion y devuelve JWT + lista de tenants disponibles
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email y contraseña son requeridos.',
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isProduction = process.env.NODE_ENV === 'production';

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: {
                memberships: {
                    where: { status: { in: ['ACTIVE', 'INVITED'] } },
                    include: {
                        tenant: {
                            select: {
                                id: true,
                                slug: true,
                                name: true,
                                status: true,
                                trialEndsAt: true,
                                plan: { select: { key: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(401).json({
                message: 'Email o contraseña incorrectos.',
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Email o contraseña incorrectos.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: 'Tu cuenta está desactivada. Contacta al administrador.',
            });
        }

        if (user.memberships.length === 0) {
            return res.status(403).json({
                message: 'No perteneces a ninguna organización. Contacta al administrador.',
            });
        }

        // Determinar tenant actual: usar currentTenantId del body, o el primero
        const requestedTenantId = req.body?.currentTenantId;
        const preferredMembership = requestedTenantId
            ? user.memberships.find((m) => m.tenantId === requestedTenantId)
            : user.memberships[0];

        if (!preferredMembership) {
            return res.status(403).json({
                message: 'No tienes acceso a esa organización.',
            });
        }

        // Bloquear tenants EXPIRED y CANCELLED en login
        const tenantStatus = preferredMembership.tenant.status;
        if (tenantStatus === 'EXPIRED') {
            return res.status(403).json({
                code: 'TENANT_EXPIRED',
                message: 'Tu periodo de prueba ha vencido. Contacta al equipo de KAI para activar tu suscripción.',
                trialEndsAt: preferredMembership.tenant.trialEndsAt,
            });
        }
        if (tenantStatus === 'CANCELLED') {
            return res.status(403).json({
                code: 'TENANT_BLOCKED',
                message: 'Este tenant está cancelado. Contacta al administrador.',
            });
        }

        const isNowExpired = tenantStatus === 'TRIAL' && new Date() > new Date(preferredMembership.tenant.trialEndsAt);
        const isReadOnly = isNowExpired || tenantStatus === 'TRIAL';

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        const token = generateUserToken(user, preferredMembership.tenantId);
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

        res.cookie('token', token, COOKIE_OPTIONS(isProduction));

        return res.json({
            message: 'Login exitoso.',
            token,
            expiresAt,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phoneNumber: user.phoneNumber,
                role: preferredMembership.role,
            },
            currentTenant: {
                id: preferredMembership.tenant.id,
                slug: preferredMembership.tenant.slug,
                name: preferredMembership.tenant.name,
                status: preferredMembership.tenant.status,
                trialEndsAt: preferredMembership.tenant.trialEndsAt,
                planKey: preferredMembership.tenant.plan?.key,
                planName: preferredMembership.tenant.plan?.name,
                role: preferredMembership.role,
                isReadOnly,
            },
            tenants: user.memberships.map((m) => ({
                id: m.tenant.id,
                slug: m.tenant.slug,
                name: m.tenant.name,
                status: m.tenant.status,
                trialEndsAt: m.tenant.trialEndsAt,
                planKey: m.tenant.plan?.key,
                planName: m.tenant.plan?.name,
                role: m.role,
                isCurrent: m.tenantId === preferredMembership.tenantId,
            })),
        });
    } catch (error) {
        console.error('[login] Error:', error);
        return res.status(500).json({
            message: 'No se pudo iniciar sesión.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * @route   POST /api/auth/switch-tenant
 * @desc    Cambia el tenant activo del usuario (emite nuevo JWT)
 * @access  Private
 *
 * Body: { tenantId: 'uuid' }
 */
export const switchTenant = async (req, res) => {
    try {
        const { tenantId } = req.body || {};

        if (!tenantId) {
            return res.status(400).json({
                message: 'tenantId es requerido.',
            });
        }

        // Verificar que el user pertenece al tenant
        const membership = await prisma.membership.findUnique({
            where: {
                userId_tenantId: {
                    userId: req.user.id,
                    tenantId,
                },
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        slug: true,
                        name: true,
                        status: true,
                        trialEndsAt: true,
                        plan: { select: { key: true, name: true } },
                    },
                },
            },
        });

        if (!membership) {
            return res.status(403).json({
                message: 'No perteneces a esa organización.',
            });
        }

        if (membership.status !== 'ACTIVE') {
            return res.status(403).json({
                message: `Tu membresía está ${membership.status.toLowerCase()}.`,
            });
        }

        // Bloquear tenants EXPIRED y CANCELLED en switchTenant
        if (membership.tenant.status === 'EXPIRED' || membership.tenant.status === 'CANCELLED') {
            return res.status(403).json({
                code: membership.tenant.status === 'EXPIRED' ? 'TENANT_EXPIRED' : 'TENANT_BLOCKED',
                message: membership.tenant.status === 'EXPIRED'
                    ? 'Tu periodo de prueba ha vencido.'
                    : 'Este tenant está cancelado.',
            });
        }

        const isReadOnly = membership.tenant.status === 'TRIAL';

        const user = {
            id: req.user.id,
            email: req.user.email,
        };

        const token = generateUserToken(user, tenantId);
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('token', token, COOKIE_OPTIONS(isProduction));

        await prisma.auditLog.create({
            data: {
                tenantId,
                userId: req.user.id,
                action: 'SWITCH_TENANT',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });

        return res.json({
            message: 'Tenant activo cambiado.',
            token,
            expiresAt,
            tenant: {
                id: membership.tenant.id,
                slug: membership.tenant.slug,
                name: membership.tenant.name,
                status: membership.tenant.status,
                trialEndsAt: membership.tenant.trialEndsAt,
                planKey: membership.tenant.plan?.key,
                planName: membership.tenant.plan?.name,
                role: membership.role,
                isReadOnly,
            },
        });
    } catch (error) {
        console.error('[switchTenant] Error:', error);
        return res.status(500).json({
            message: 'No se pudo cambiar de organización.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Cierra sesion (limpia la cookie)
 * @access  Private
 */
export const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';

        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict',
        });

        return res.json({ message: 'Sesión cerrada.' });
    } catch (error) {
        console.error('[logout] Error:', error);
        return res.status(500).json({ message: 'Error al cerrar sesión.' });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Devuelve info del usuario actual + memberships + tenant activo
 * @access  Private (requiere verifyToken, NO requiere tenantResolver)
 */
export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                phoneNumber: true,
                position: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
                memberships: {
                    where: { status: { in: ['ACTIVE', 'INVITED'] } },
                    include: {
                        tenant: {
                            select: {
                                id: true,
                                slug: true,
                                name: true,
                                status: true,
                                trialEndsAt: true,
                                plan: { select: { key: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const currentTenantId = req.user.currentTenantId;
        const currentMembership = user.memberships.find((m) => m.tenantId === currentTenantId);

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phoneNumber: user.phoneNumber,
                position: user.position,
                lastLoginAt: user.lastLoginAt,
                role: currentMembership ? currentMembership.role : null,
            },
            currentTenant: currentMembership
                ? {
                    id: currentMembership.tenant.id,
                    slug: currentMembership.tenant.slug,
                    name: currentMembership.tenant.name,
                    status: currentMembership.tenant.status,
                    trialEndsAt: currentMembership.tenant.trialEndsAt,
                    planKey: currentMembership.tenant.plan?.key,
                    planName: currentMembership.tenant.plan?.name,
                    role: currentMembership.role,
                    isReadOnly: currentMembership.tenant.status === 'TRIAL',
                }
                : null,
            tenants: user.memberships.map((m) => ({
                id: m.tenant.id,
                slug: m.tenant.slug,
                name: m.tenant.name,
                status: m.tenant.status,
                trialEndsAt: m.tenant.trialEndsAt,
                planKey: m.tenant.plan?.key,
                planName: m.tenant.plan?.name,
                role: m.role,
                isCurrent: m.tenantId === currentTenantId,
            })),
        });
    } catch (error) {
        console.error('[getMe] Error:', error);
        return res.status(500).json({ message: 'Error al obtener información del usuario.' });
    }
};

/**
 * @route   POST /api/auth/register
 * @desc    Crear usuario nuevo dentro del tenant activo (solo OWNER)
 * @access  Private (OWNER)
 */
export const register = async (req, res) => {
    try {
        const { name, email, password, phoneNumber, position, role } = req.body;
        const tenantId = req.tenant.id;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const validRoles = ['OWNER', 'ADMIN', 'SALES', 'OPERATOR', 'VIEWER'];
        const memberRole = validRoles.includes(role) ? role : 'SALES';

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            const alreadyMember = await prisma.membership.findUnique({
                where: { userId_tenantId: { userId: existingUser.id, tenantId } },
            });
            if (alreadyMember) {
                return res.status(409).json({ message: 'El usuario ya pertenece a este tenant.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            const user = existingUser || await tx.user.create({
                data: { name, email, password: hashedPassword, phoneNumber, position },
            });

            const membership = await tx.membership.create({
                data: {
                    userId: user.id,
                    tenantId,
                    role: memberRole,
                    status: 'ACTIVE',
                },
                include: { user: { select: { id: true, name: true, email: true, phoneNumber: true, position: true, isActive: true } } },
            });

            return membership;
        });

        res.status(201).json({
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            phoneNumber: result.user.phoneNumber,
            position: result.user.position,
            isActive: result.user.isActive,
            role: result.role,
            membershipId: result.id,
        });
    } catch (error) {
        console.error('[register] Error:', error);
        res.status(500).json({ message: 'Error al crear el usuario.' });
    }
};

/**
 * @route   GET /api/auth/users
 * @desc    Lista usuarios (memberships) del tenant activo
 * @access  Private (OWNER, ADMIN)
 */
export const getUsers = async (req, res) => {
    try {
        const tenantId = req.tenant.id;

        const memberships = await prisma.membership.findMany({
            where: { tenantId, status: { not: 'INVITED' } },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phoneNumber: true, position: true, isActive: true },
                },
            },
            orderBy: { user: { name: 'asc' } },
        });

        const users = memberships.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            phoneNumber: m.user.phoneNumber,
            position: m.user.position,
            isActive: m.user.isActive,
            role: m.role,
            membershipId: m.id,
            membershipStatus: m.status,
        }));

        res.json({ users });
    } catch (error) {
        console.error('[getUsers] Error:', error);
        res.status(500).json({ message: 'Error al obtener usuarios.' });
    }
};

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Actualizar datos de un usuario (solo OWNER)
 * @access  Private (OWNER)
 */
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phoneNumber, position, role } = req.body;
        const tenantId = req.tenant.id;

        const membership = await prisma.membership.findUnique({
            where: { userId_tenantId: { userId: id, tenantId } },
        });
        if (!membership) {
            return res.status(404).json({ message: 'El usuario no pertenece a este tenant.' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
        if (position !== undefined) updateData.position = position;

        const validRoles = ['OWNER', 'ADMIN', 'SALES', 'OPERATOR', 'VIEWER'];

        if (role !== undefined && validRoles.includes(role) && role !== membership.role) {
            // Proteccion: no permitir dejar al tenant sin OWNERs
            if (membership.role === 'OWNER' && role !== 'OWNER') {
                const ownerCount = await prisma.membership.count({
                    where: { tenantId, role: 'OWNER', status: 'ACTIVE' },
                });
                if (ownerCount <= 1) {
                    return res.status(400).json({
                        message: 'No puedes cambiar el rol del unico OWNER del tenant. Agrega otro OWNER primero.',
                    });
                }
            }

            await prisma.membership.update({
                where: { id: membership.id },
                data: { role },
            });
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({ where: { id }, data: updateData });
        }

        res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        console.error('[updateUser] Error:', error);
        res.status(500).json({ message: 'Error al actualizar usuario.' });
    }
};

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Desactivar usuario (soft delete, solo OWNER)
 * @access  Private (OWNER)
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant.id;

        const membership = await prisma.membership.findUnique({
            where: { userId_tenantId: { userId: id, tenantId } },
        });
        if (!membership) {
            return res.status(404).json({ message: 'El usuario no pertenece a este tenant.' });
        }

        // Proteccion: no puedes desactivarte a ti mismo
        if (id === req.user.id) {
            return res.status(400).json({
                message: 'No puedes desactivarte a ti mismo. Pide a otro OWNER que lo haga.',
            });
        }

        // Proteccion: no permitir dejar al tenant sin OWNERs
        if (membership.role === 'OWNER') {
            const ownerCount = await prisma.membership.count({
                where: { tenantId, role: 'OWNER', status: 'ACTIVE' },
            });
            if (ownerCount <= 1) {
                return res.status(400).json({
                    message: 'No puedes desactivar al unico OWNER del tenant.',
                });
            }
        }

        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        res.json({ message: 'Usuario desactivado correctamente.' });
    } catch (error) {
        console.error('[deleteUser] Error:', error);
        res.status(500).json({ message: 'Error al desactivar usuario.' });
    }
};

/**
 * @route   POST /api/auth/users/:id/reset-password
 * @desc    Resetear contraseña de un usuario (solo OWNER)
 * @access  Private (OWNER)
 */
export const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        const tenantId = req.tenant.id;

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const membership = await prisma.membership.findUnique({
            where: { userId_tenantId: { userId: id, tenantId } },
        });
        if (!membership) {
            return res.status(404).json({ message: 'El usuario no pertenece a este tenant.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('[resetPassword] Error:', error);
        res.status(500).json({ message: 'Error al cambiar la contraseña.' });
    }
};
