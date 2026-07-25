import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../config/database.js';
import { generateSuperAdminToken } from '../middleware/auth.middleware.js';
import { runWorkers, getWorkersStatus } from '../workers/index.js';
import { PLANS, getPlanLimits, TRIAL_DURATION_DAYS } from '../config/plans.config.js';

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const COOKIE_OPTIONS = (isProduction) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: SESSION_MAX_AGE_MS,
});

/**
 * Verifica un codigo TOTP segun RFC 6238.
 * Implementacion pura con crypto de Node (sin dependencias externas).
 * @param {string} totpCode - Codigo de 6 digitos ingresado por el usuario
 * @param {string} base32Secret - Secret en Base32 guardado en superAdmin.totpSecret
 * @param {number} windowSteps - Ventana de tolerancia (±N pasos de 30s). Default: 1 = ±30s.
 * @returns {boolean} true si el codigo es valido
 */
const verifyTotp = (totpCode, base32Secret, windowSteps = 1) => {
    if (!totpCode || !base32Secret) return false;
    if (typeof totpCode !== 'string') return false;
    if (!/^\d{6}$/.test(totpCode)) return false;

    // Decodificar Base32 (RFC 4648) -> Buffer
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanSecret = base32Secret.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
    let bits = '';
    for (const ch of cleanSecret) {
        const idx = base32Chars.indexOf(ch);
        if (idx === -1) return false;
        bits += idx.toString(2).padStart(5, '0');
    }
    const keyBytes = Buffer.from(
        bits.match(/.{1,8}/g).map((b) => parseInt(b.padEnd(8, '0'), 2))
    );

    const now = Math.floor(Date.now() / 1000);
    // Probar el step actual y los ±windowSteps
    for (let i = -windowSteps; i <= windowSteps; i++) {
        const counter = Math.floor(now / 30) + i;
        const counterBuf = Buffer.alloc(8);
        // Big-endian 64-bit
        counterBuf.writeBigUInt64BE(BigInt(counter));

        const hmac = crypto.createHmac('sha1', keyBytes).update(counterBuf).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);
        const codeStr = String(code % 1_000_000).padStart(6, '0');

        if (codeStr === totpCode) return true;
    }
    return false;
};

// =============================================================================
// AUTH SUPER-ADMIN
// =============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Login de super-admin
 * @access  Public (pero requiere email estar en la tabla SuperAdmin)
 */
export const adminLogin = async (req, res) => {
    try {
        const { email, password, totpCode } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contrasena son requeridos.' });
        }

        // FIX BUG #18: validar formato basico de email
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Formato de email invalido.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isProduction = process.env.NODE_ENV === 'production';

        const superAdmin = await prisma.superAdmin.findUnique({
            where: { email: normalizedEmail },
        });

        if (!superAdmin) {
            return res.status(401).json({ message: 'Credenciales invalidas.' });
        }

        if (!superAdmin.isActive) {
            return res.status(403).json({ message: 'Cuenta de super-admin desactivada.' });
        }

        const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales invalidas.' });
        }

        // Si tiene TOTP habilitado, requerir y validar codigo (RFC 6238)
        let totpVerified = false;
        if (superAdmin.totpEnabled) {
            if (!totpCode) {
                return res.status(403).json({
                    message: 'Se requiere código TOTP.',
                    requiresTotp: true,
                });
            }
            // Validacion real: SIEMPRE se ejecuta, en dev y prod.
            // En dev, permitimos un codigo maestro via env TOTP_DEV_BYPASS para no bloquear testing.
            const devBypass = process.env.TOTP_DEV_BYPASS;
            const isDev = process.env.NODE_ENV !== 'production';
            if (isDev && devBypass && totpCode === devBypass) {
                totpVerified = true;
            } else if (superAdmin.totpSecret && verifyTotp(totpCode, superAdmin.totpSecret)) {
                totpVerified = true;
            } else {
                return res.status(403).json({ message: 'Código TOTP inválido.' });
            }
        }

        const token = generateSuperAdminToken(superAdmin, { totpVerified });
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();

        res.cookie('admin_token', token, COOKIE_OPTIONS(isProduction));

        return res.json({
            message: 'Login exitoso.',
            token,
            expiresAt,
            superAdmin: {
                id: superAdmin.id,
                email: superAdmin.email,
                name: superAdmin.name,
                totpEnabled: superAdmin.totpEnabled,
            },
        });
    } catch (error) {
        console.error('[adminLogin] Error:', error);
        return res.status(500).json({ message: 'Error al iniciar sesion.' });
    }
};

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout de super-admin
 * @access  Private
 */
export const adminLogout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('admin_token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'strict',
        });
        return res.json({ message: 'Sesion cerrada.' });
    } catch (error) {
        console.error('[adminLogout] Error:', error);  // FIX BUG #16
        return res.status(500).json({ message: 'Error al cerrar sesion.' });
    }
};

/**
 * @route   GET /api/admin/auth/me
 * @desc    Info del super-admin actual
 * @access  Private
 */
export const adminGetMe = async (req, res) => {
    return res.json({ superAdmin: req.superAdmin });
};

// =============================================================================
// TENANTS
// =============================================================================

const computeUsage = async (tenantId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
        users,
        quotesNotConverted,
        paymentNotices,
        activeShipments,
        totalClients,
        totalAllies,
    ] = await Promise.all([
        prisma.membership.count({ where: { tenantId, status: 'ACTIVE' } }),
        prisma.quote.count({
            where: { tenantId, status: { not: 'CONVERTED' }, createdAt: { gte: startOfMonth } },
        }),
        prisma.paymentNotice.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
        prisma.shipment.count({
            where: { tenantId, status: { not: 'DELIVERED' }, deletedAt: null },
        }),
        prisma.client.count({ where: { tenantId, deletedAt: null } }),
        prisma.ally.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return {
        users,
        documentsThisMonth: quotesNotConverted + paymentNotices,
        activeShipments,
        totalClients,
        totalAllies,
    };
};

/**
 * FIX BUG #5: Calcula usage para multiples tenants en batch (1 sola pasada por tabla).
 * Antes: Promise.all(tenants.map(computeUsage)) -> 6 queries por tenant = N+1.
 * Ahora: 6 queries totales sin importar cuantos tenants haya.
 */
const computeUsageBatch = async (tenantIds) => {
    if (tenantIds.length === 0) return new Map();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
        memberships,
        quotes,
        paymentNotices,
        shipments,
        clients,
        allies,
    ] = await Promise.all([
        prisma.membership.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, status: 'ACTIVE' },
            _count: { _all: true },
        }),
        prisma.quote.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, status: { not: 'CONVERTED' }, createdAt: { gte: startOfMonth } },
            _count: { _all: true },
        }),
        prisma.paymentNotice.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, createdAt: { gte: startOfMonth } },
            _count: { _all: true },
        }),
        prisma.shipment.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, status: { not: 'DELIVERED' }, deletedAt: null },
            _count: { _all: true },
        }),
        prisma.client.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, deletedAt: null },
            _count: { _all: true },
        }),
        prisma.ally.groupBy({
            by: ['tenantId'],
            where: { tenantId: { in: tenantIds }, deletedAt: null },
            _count: { _all: true },
        }),
    ]);

    const toMap = (rows) => new Map(rows.map((r) => [r.tenantId, r._count._all]));

    const usersMap = toMap(memberships);
    const quotesMap = toMap(quotes);
    const noticesMap = toMap(paymentNotices);
    const shipmentsMap = toMap(shipments);
    const clientsMap = toMap(clients);
    const alliesMap = toMap(allies);

    const result = new Map();
    for (const tid of tenantIds) {
        const quotesCount = quotesMap.get(tid) || 0;
        const noticesCount = noticesMap.get(tid) || 0;
        result.set(tid, {
            users: usersMap.get(tid) || 0,
            documentsThisMonth: quotesCount + noticesCount,
            activeShipments: shipmentsMap.get(tid) || 0,
            totalClients: clientsMap.get(tid) || 0,
            totalAllies: alliesMap.get(tid) || 0,
        });
    }
    return result;
};

/**
 * @route   POST /api/admin/tenants
 * @desc    Crea un tenant nuevo con su usuario admin y configuración inicial
 * @access  Private (super-admin)
 *
 * Body:
 * - companyName: string (requerido)
 * - email: string (requerido) — email del usuario admin/OWNER
 * - password: string (requerido, min 6 chars)
 * - name: string (requerido) — nombre del usuario admin
 * - planKey: 'BASE' | 'PRO' (default BASE)
 */
export const createTenant = async (req, res) => {
    try {
        const { companyName, email, password, name, planKey = 'BASE' } = req.body || {};

        if (!companyName || !email || !password || !name) {
            return res.status(400).json({
                message: 'companyName, email, password y name son requeridos.',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres.',
            });
        }

        const plan = await prisma.plan.findUnique({ where: { key: planKey } });
        if (!plan) {
            return res.status(400).json({ message: `Plan "${planKey}" no existe.` });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Verificar que no exista un usuario con ese email ya asignado a un tenant
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { memberships: true },
        });

        if (existingUser && existingUser.memberships.length > 0) {
            return res.status(409).json({
                message: 'Ya existe un usuario con ese email en un tenant.',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generar slug único
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

        const generateUniqueSlug = async (baseName, tx) => {
            let baseSlug = slugify(baseName);
            if (!baseSlug) baseSlug = 'tenant';
            let slug = baseSlug;
            let counter = 1;
            // FIX BUG #9: limite de intentos para evitar loop infinito en caso improbable
            while (counter < 1000) {
                const existing = await tx.tenant.findUnique({ where: { slug } });
                if (!existing) return slug;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            // Fallback: slug con timestamp
            return `${baseSlug}-${Date.now()}`;
        };

        const result = await prisma.$transaction(async (tx) => {
            let user;

            if (existingUser) {
                user = await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        password: hashedPassword,
                        name,
                        isActive: true,
                        // FIX BUG #15: no setear lastLoginAt en la creacion del tenant
                    },
                });
            } else {
                user = await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        password: hashedPassword,
                        name,
                        isActive: true,
                        // FIX BUG #15: lastLoginAt queda null hasta el primer login real
                    },
                });
            }

            const slug = await generateUniqueSlug(companyName, tx);
            const now = new Date();
            const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

            // FIX BUG #9: try/catch para P2002 (unique constraint) y reintentar slug
            let tenant;
            let attempts = 0;
            while (attempts < 3) {
                try {
                    tenant = await tx.tenant.create({
                        data: {
                            slug,
                            name: companyName.trim(),
                            status: 'TRIAL',
                            trialEndsAt,
                            planId: plan.id,
                            createdByUserId: user.id,
                        },
                    });
                    break;
                } catch (err) {
                    if (err.code === 'P2002' && err.meta?.target?.includes('slug')) {
                        slug = await generateUniqueSlug(`${companyName}-${attempts}`, tx);
                        attempts++;
                        continue;
                    }
                    throw err;
                }
            }
            if (!tenant) {
                throw new Error('No se pudo generar un slug unico despues de 3 intentos.');
            }

            await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan.id,
                    status: 'TRIAL',
                    startDate: now,
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEndsAt,
                    nextPaymentDueAt: trialEndsAt,
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
                data: { tenantId: tenant.id },
            });

            return { tenant, user };
        });

        return res.status(201).json({
            message: 'Tenant creado exitosamente.',
            data: {
                tenantId: result.tenant.id,
                slug: result.tenant.slug,
                name: result.tenant.name,
                email: result.user.email,
                trialEndsAt: result.tenant.trialEndsAt,
            },
        });
    } catch (error) {
        console.error('[createTenant] Error:', error);
        return res.status(500).json({ message: 'Error al crear el tenant.' });
    }
};

/**
 * @route   GET /api/admin/tenants
 * @desc    Lista todos los tenants con metricas de uso
 * @access  Private (super-admin)
 *
 * Query params:
 * - status: TRIAL | ACTIVE | PAST_DUE | SUSPENDED | EXPIRED | CANCELLED
 * - plan: BASE | PRO
 * - search: texto libre (slug, name, email del owner)
 * - trialExpiringSoon: true (vence en < 3 dias)
 */
export const listTenants = async (req, res) => {
    try {
        const { status, plan, search, trialExpiringSoon, page = '1', pageSize = '50' } = req.query;

        // FIX: Validar status contra enum
        const validStatuses = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `status invalido. Valores: ${validStatuses.join(', ')}` });
        }

        // FIX: Validar plan contra enum
        const validPlans = ['BASE', 'PRO'];
        if (plan && !validPlans.includes(plan)) {
            return res.status(400).json({ message: `plan invalido. Valores: ${validPlans.join(', ')}` });
        }

        // FIX: Paginacion para evitar respuestas gigantes
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const sizeNum = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
        const skip = (pageNum - 1) * sizeNum;

        const where = {};

        if (status) where.status = status;
        if (plan) where.plan = { key: plan };

        if (trialExpiringSoon === 'true') {
            const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            where.status = 'TRIAL';
            where.trialEndsAt = { lte: threeDaysFromNow, gte: new Date() };
        }

        if (search) {
            where.OR = [
                { slug: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                {
                    memberships: {
                        some: {
                            user: { email: { contains: search, mode: 'insensitive' } },
                        },
                    },
                },
            ];
        }

        const [tenants, total] = await Promise.all([
            prisma.tenant.findMany({
                where,
                include: {
                    plan: { select: { key: true, name: true, priceUsd: true } },
                    subscription: {
                        select: { status: true, currentPeriodEnd: true, nextPaymentDueAt: true },
                    },
                    _count: {
                        select: {
                            memberships: { where: { status: 'ACTIVE' } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: sizeNum,
            }),
            prisma.tenant.count({ where }),
        ]);

        // FIX BUG #5: batch query en vez de N+1
        const usageMap = await computeUsageBatch(tenants.map((t) => t.id));

        const tenantsWithUsage = tenants.map((t) => {
            const usage = usageMap.get(t.id) || { users: 0, documentsThisMonth: 0, activeShipments: 0, totalClients: 0, totalAllies: 0 };
            const limits = t.plan ? getPlanLimits(t.plan.key) : PLANS.BASE.limits;

            // FIX: trialDaysRemaining solo si esta en TRIAL y la fecha es futura
            const trialDaysRemaining = (t.status === 'TRIAL' && t.trialEndsAt && t.trialEndsAt > new Date())
                ? Math.ceil((t.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
                : null;

            return {
                id: t.id,
                slug: t.slug,
                name: t.name,
                rif: t.rif,
                status: t.status,
                trialEndsAt: t.trialEndsAt,
                trialDaysRemaining,
                plan: t.plan,
                subscription: t.subscription,
                usage,
                limits,
                createdAt: t.createdAt,
            };
        });

        return res.json({
            data: tenantsWithUsage,
            pagination: {
                page: pageNum,
                pageSize: sizeNum,
                total,
                totalPages: Math.ceil(total / sizeNum),
            },
        });
    } catch (error) {
        console.error('[listTenants] Error:', error);
        return res.status(500).json({ message: 'Error al listar tenants.' });
    }
};

/**
 * @route   GET /api/admin/tenants/:id
 * @desc    Detalle completo de un tenant
 * @access  Private (super-admin)
 */
export const getTenantDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                plan: true,
                subscription: true,
                settings: true,
                memberships: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                                phoneNumber: true,
                                isActive: true,
                                lastLoginAt: true,
                            },
                        },
                    },
                    orderBy: { joinedAt: 'asc' },
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        const usage = await computeUsage(id);
        const limits = tenant.plan ? getPlanLimits(tenant.plan.key) : PLANS.BASE.limits;

        return res.json({
            data: {
                ...tenant,
                usage,
                limits,
            },
        });
    } catch (error) {
        console.error('[getTenantDetail] Error:', error);
        return res.status(500).json({ message: 'Error al obtener detalle del tenant.' });
    }
};

/**
 * @route   POST /api/admin/tenants/:id/activate
 * @desc    Activa un tenant (TRIAL/EXPIRED/PAST_DUE/SUSPENDED → ACTIVE)
 * @access  Private (super-admin)
 */
export const activateTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        // FIX BUG #22: no permitir reactivar un CANCELLED por esta via
        if (tenant.status === 'CANCELLED') {
            return res.status(409).json({
                message: 'No se puede activar un tenant cancelado. Use el flujo de re-suscripcion.',
            });
        }
        if (tenant.status === 'ACTIVE') {
            return res.status(409).json({ message: 'El tenant ya esta activo.' });
        }
        if (tenant.status === 'SUSPENDED') {
            return res.status(409).json({
                message: 'Use el endpoint /unsuspend para reactivar un tenant suspendido.',
            });
        }

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const [updatedTenant] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    trialEndsAt: null,
                },
            }),
            prisma.subscription.upsert({
                where: { tenantId: id },
                update: {
                    status: 'ACTIVE',
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextPaymentDueAt: periodEnd,
                },
                create: {
                    tenantId: id,
                    planId: tenant.planId,
                    status: 'ACTIVE',
                    startDate: now,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    nextPaymentDueAt: periodEnd,
                },
            }),
            prisma.auditLog.create({
                data: {
                    tenantId: id,
                    superAdminId: req.superAdmin.id,
                    action: 'ACTIVATE_TENANT',
                    metadata: { previousStatus: tenant.status },
                },
            }),
        ]);

        return res.json({ message: 'Tenant activado.', data: updatedTenant });
    } catch (error) {
        console.error('[activateTenant] Error:', error);
        return res.status(500).json({ message: 'Error al activar el tenant.' });
    }
};

/**
 * @route   POST /api/admin/tenants/:id/suspend
 * @desc    Suspende un tenant
 * @access  Private (super-admin)
 */
export const suspendTenant = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        // FIX: validar transicion de estado
        if (tenant.status === 'SUSPENDED') {
            return res.status(409).json({ message: 'El tenant ya esta suspendido.' });
        }
        if (tenant.status === 'CANCELLED') {
            return res.status(409).json({ message: 'No se puede suspender un tenant cancelado.' });
        }

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: { status: 'SUSPENDED' },
            }),
            prisma.subscription.updateMany({
                where: { tenantId: id },
                data: {
                    status: 'SUSPENDED',
                    nextPaymentDueAt: null,  // FIX BUG #10: limpiar fecha de pago
                },
            }),
            prisma.auditLog.create({
                data: {
                    tenantId: id,
                    superAdminId: req.superAdmin.id,
                    action: 'SUSPEND_TENANT',
                    metadata: { reason: reason || 'No especificado', previousStatus: tenant.status },
                },
            }),
        ]);

        return res.json({ message: 'Tenant suspendido.', data: updated });
    } catch (error) {
        console.error('[suspendTenant] Error:', error);
        return res.status(500).json({ message: 'Error al suspender el tenant.' });
    }
};

/**
 * @route   POST /api/admin/tenants/:id/unsuspend
 * @desc    Reactiva un tenant suspendido
 * @access  Private (super-admin)
 */
export const unsuspendTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        // Solo se puede des-suspender un tenant que esta SUSPENDED
        if (tenant.status !== 'SUSPENDED') {
            return res.status(409).json({
                message: `El tenant no esta suspendido (estado actual: ${tenant.status}).`,
            });
        }

        // Al des-suspender, renovamos el periodo desde hoy (+1 mes)
        const now = new Date();
        const newPeriodEnd = new Date(now);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    trialEndsAt: null,
                },
            }),
            prisma.subscription.updateMany({
                where: { tenantId: id },
                data: {
                    status: 'ACTIVE',
                    currentPeriodStart: now,        // FIX: renovar periodo desde hoy
                    currentPeriodEnd: newPeriodEnd,
                    nextPaymentDueAt: newPeriodEnd,
                },
            }),
            prisma.auditLog.create({
                data: {
                    tenantId: id,
                    superAdminId: req.superAdmin.id,
                    action: 'ACTIVATE_TENANT',
                    metadata: { previousStatus: tenant.status, action: 'unsuspend' },
                },
            }),
        ]);

        return res.json({ message: 'Tenant reactivado.', data: updated });
    } catch (error) {
        console.error('[unsuspendTenant] Error:', error);
        return res.status(500).json({ message: 'Error al reactivar el tenant.' });
    }
};

/**
 * @route   POST /api/admin/tenants/:id/extend-trial
 * @desc    Extiende el trial de un tenant N dias
 * @access  Private (super-admin)
 */
export const extendTrial = async (req, res) => {
    try {
        const { id } = req.params;
        const { days } = req.body || {};

        // FIX: Validacion mas estricta de days
        const daysNum = Number(days);
        if (!Number.isInteger(daysNum) || daysNum < 1 || daysNum > 90) {
            return res.status(400).json({ message: 'days debe ser un entero entre 1 y 90.' });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        // FIX BUG #7: solo se puede extender trial a tenants en TRIAL o EXPIRED
        // (un cliente ACTIVE/PAST_DUE que paga NO debe rebajarse a TRIAL)
        if (!['TRIAL', 'EXPIRED'].includes(tenant.status)) {
            return res.status(409).json({
                message: `Solo se puede extender el trial a tenants en TRIAL o EXPIRED (estado actual: ${tenant.status}).`,
            });
        }

        const baseDate = tenant.trialEndsAt && tenant.trialEndsAt > new Date()
            ? tenant.trialEndsAt
            : new Date();
        const newTrialEndsAt = new Date(baseDate.getTime() + daysNum * 24 * 60 * 60 * 1000);
        const previousStatus = tenant.status;

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: {
                    trialEndsAt: newTrialEndsAt,
                    status: 'TRIAL',  // OK ahora: ya validamos que el origen era TRIAL/EXPIRED
                },
            }),
            prisma.subscription.updateMany({
                where: { tenantId: id },
                data: {
                    status: 'TRIAL',
                    currentPeriodEnd: newTrialEndsAt,
                    nextPaymentDueAt: newTrialEndsAt,
                },
            }),
            prisma.auditLog.create({
                data: {
                    tenantId: id,
                    superAdminId: req.superAdmin.id,
                    action: 'EXTEND_TRIAL',
                    metadata: { days: daysNum, newTrialEndsAt, previousStatus },  // FIX: registrar previousStatus
                },
            }),
        ]);

        return res.json({
            message: `Trial extendido ${daysNum} dias.`,
            data: updated,
        });
    } catch (error) {
        console.error('[extendTrial] Error:', error);
        return res.status(500).json({ message: 'Error al extender el trial.' });
    }
};

// =============================================================================
// PAYMENTS
// =============================================================================

/**
 * @route   POST /api/admin/payments
 * @desc    Registra un pago recibido de un tenant
 * @access  Private (super-admin)
 *
 * Body: { tenantId, amountUsd, method, reference?, notes?, periodStart, periodEnd }
 */
export const registerPayment = async (req, res) => {
    try {
        const { tenantId, amountUsd, method, reference, notes, periodStart, periodEnd } = req.body || {};

        if (!tenantId || !amountUsd || !method || !periodStart || !periodEnd) {
            return res.status(400).json({
                message: 'tenantId, amountUsd, method, periodStart y periodEnd son requeridos.',
            });
        }

        // Validar amountUsd positivo
        const amountNum = Number(amountUsd);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return res.status(400).json({ message: 'amountUsd debe ser un numero positivo.' });
        }

        // Validar fechas validas y rango coherente
        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return res.status(400).json({ message: 'periodStart y periodEnd deben ser fechas validas.' });
        }
        if (endDate <= startDate) {
            return res.status(400).json({ message: 'periodEnd debe ser mayor que periodStart.' });
        }

        // Validar method contra el enum PaymentMethod
        const validMethods = ['PAGO_MOVIL', 'ZELLE', 'EFECTIVO_USD', 'TRANSFERENCIA', 'TRANSFERENCIA_INTERNACIONAL', 'BINANCE_USDT', 'OTRO'];
        if (!validMethods.includes(method)) {
            return res.status(400).json({ message: `method invalido. Valores permitidos: ${validMethods.join(', ')}` });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        // Determinar si el pago reactiva al tenant
        const reactivatesTenant = ['PAST_DUE', 'EXPIRED', 'SUSPENDED'].includes(tenant.status);
        const previousStatus = tenant.status;

        // Operacion atomica: crear pago, posiblemente reactivar tenant y subscription, audit log
        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    tenantId,
                    amountUsd: amountNum,
                    method,
                    reference: reference || null,
                    notes: notes || null,
                    periodStart: startDate,
                    periodEnd: endDate,
                    confirmedById: req.superAdmin.id,
                    confirmedAt: new Date(),
                },
            });

            if (reactivatesTenant) {
                await tx.tenant.update({
                    where: { id: tenantId },
                    data: {
                        status: 'ACTIVE',
                        trialEndsAt: null,  // FIX: limpiar trial al reactivar por pago
                    },
                });
                await tx.subscription.updateMany({
                    where: { tenantId },
                    data: {
                        status: 'ACTIVE',
                        currentPeriodStart: startDate,   // FIX: usar fechas del pago, no del periodo anterior
                        currentPeriodEnd: endDate,
                        nextPaymentDueAt: endDate,
                    },
                });
            } else {
                // Tenant ya estaba ACTIVE/TRIAL: solo refrescar fechas del periodo cubierto
                await tx.subscription.updateMany({
                    where: { tenantId },
                    data: {
                        currentPeriodStart: startDate,
                        currentPeriodEnd: endDate,
                        nextPaymentDueAt: endDate,
                    },
                });
            }

            await tx.auditLog.create({
                data: {
                    tenantId,
                    superAdminId: req.superAdmin.id,
                    action: 'REGISTER_PAYMENT',
                    metadata: {
                        amountUsd: amountNum,
                        method,
                        paymentId: payment.id,
                        previousStatus,
                        reactivatesTenant,
                    },
                },
            });

            return { payment, reactivatesTenant, previousStatus };
        });

        return res.status(201).json({
            message: reactivatesTenant
                ? 'Pago registrado y tenant reactivado.'
                : 'Pago registrado.',
            data: {
                payment: result.payment,
                previousStatus: result.previousStatus,
                newStatus: reactivatesTenant ? 'ACTIVE' : tenant.status,
            },
        });
    } catch (error) {
        console.error('[registerPayment] Error:', error);
        return res.status(500).json({ message: 'Error al registrar el pago.' });
    }
};

/**
 * @route   GET /api/admin/payments
 * @desc    Historial de pagos
 * @access  Private (super-admin)
 */
export const listPayments = async (req, res) => {
    try {
        const { tenantId, from, to } = req.query;
        const where = {};

        if (tenantId) where.tenantId = tenantId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                tenant: { select: { id: true, slug: true, name: true } },
                confirmedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        return res.json({ data: payments });
    } catch (error) {
        console.error('[listPayments] Error:', error);
        return res.status(500).json({ message: 'Error al listar pagos.' });
    }
};

// =============================================================================
// METRICS
// =============================================================================

/**
 * @route   GET /api/admin/metrics
 * @desc    Metricas globales del SaaS
 * @access  Private (super-admin)
 */
export const getMetrics = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const [
            totalTenants,
            tenantsByStatus,
            tenantsByPlan,
            trialsExpiringSoon,
            paymentsThisMonth,
            workersStatus,
        ] = await Promise.all([
            prisma.tenant.count(),
            prisma.tenant.groupBy({
                by: ['status'],
                _count: { _all: true },
            }),
            prisma.tenant.groupBy({
                by: ['planId'],
                _count: { _all: true },
                where: { planId: { not: null } },
            }),
            prisma.tenant.findMany({
                where: {
                    status: 'TRIAL',
                    trialEndsAt: { gte: now, lte: threeDaysFromNow },
                },
                select: { id: true, slug: true, name: true, trialEndsAt: true },
            }),
            prisma.payment.aggregate({
                where: { confirmedAt: { gte: startOfMonth } },
                _sum: { amountUsd: true },
                _count: { _all: true },
            }),
            Promise.resolve(getWorkersStatus()),
        ]);

        const plans = await prisma.plan.findMany();
        const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));

        const activePaidTenants = tenantsByStatus
            .filter((t) => t.status === 'ACTIVE')
            .reduce((acc, t) => acc + t._count._all, 0);

        // FIX BUG #6: MRR solo cuenta tenants ACTIVE (los unicos que pagan)
        const activeTenantCounts = await prisma.tenant.groupBy({
            by: ['planId'],
            where: { status: 'ACTIVE', planId: { not: null } },
            _count: { _all: true },
        });

        const mrrUsd = activeTenantCounts.reduce((acc, t) => {
            const plan = planMap[t.planId];
            if (!plan) return acc;
            return acc + Number(plan.priceUsd) * t._count._all;
        }, 0);

        return res.json({
            data: {
                totalTenants,
                activePaidTenants,
                mrrUsd,  // FIX BUG #8: nombre de variable consistente con el JSON
                tenantsByStatus: Object.fromEntries(
                    tenantsByStatus.map((t) => [t.status, t._count._all])
                ),
                tenantsByPlan: tenantsByPlan.map((t) => ({
                    planId: t.planId,
                    planKey: planMap[t.planId]?.key,
                    planName: planMap[t.planId]?.name,
                    count: t._count._all,
                })),
                trialsExpiringSoon,
                paymentsThisMonth: {
                    count: paymentsThisMonth._count._all,
                    totalUsd: paymentsThisMonth._sum.amountUsd
                        ? Number(paymentsThisMonth._sum.amountUsd)
                        : 0,
                },
                workersStatus,
            },
        });
    } catch (error) {
        console.error('[getMetrics] Error:', error);
        return res.status(500).json({ message: 'Error al obtener métricas.' });
    }
};

// =============================================================================
// WORKERS
// =============================================================================

/**
 * @route   POST /api/admin/workers/run
 * @desc    Ejecuta manualmente un worker (debug/testing)
 * @access  Private (super-admin)
 *
 * Body: { jobName: 'trialExpiration' | 'payablesExpiring' | 'shipmentsArriving' }
 */
export const runWorker = async (req, res) => {
    try {
        const { jobName } = req.body || {};

        if (!jobName) {
            return res.status(400).json({ message: 'jobName es requerido.' });
        }

        // FIX: validar contra jobs conocidos
        const validJobs = ['trialExpiration', 'payablesExpiring', 'shipmentsArriving'];
        if (!validJobs.includes(jobName)) {
            return res.status(400).json({
                message: `jobName invalido. Valores permitidos: ${validJobs.join(', ')}`,
            });
        }

        const result = await runWorkers(jobName);

        return res.json({
            message: `Worker ${jobName} ejecutado.`,
            data: result,
        });
    } catch (error) {
        console.error('[runWorker] Error:', error);
        // FIX BUG #23: distinguir error de validacion (4xx) de error de servidor (5xx)
        if (error.message && error.message.startsWith('INVALID_JOB')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error al ejecutar el worker.' });
    }
};

/**
 * @route   GET /api/admin/workers/status
 * @desc    Estado actual de los workers (ultima ejecucion, errores)
 * @access  Private (super-admin)
 */
export const getWorkersInfo = async (req, res) => {
    try {  // FIX BUG #17
        return res.json({ data: getWorkersStatus() });
    } catch (error) {
        console.error('[getWorkersInfo] Error:', error);
        return res.status(500).json({ message: 'Error al obtener estado de workers.' });
    }
};
