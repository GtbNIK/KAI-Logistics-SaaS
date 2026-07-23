import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { generateSuperAdminToken } from '../middleware/auth.middleware.js';
import { runWorkers, getWorkersStatus } from '../workers/index.js';
import { PLANS, getPlanLimits } from '../config/plans.config.js';

const SESSION_MAX_AGE_MS = 60 * 60 * 1000;
const COOKIE_OPTIONS = (isProduction) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'strict',
    maxAge: SESSION_MAX_AGE_MS,
});

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
            return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const isProduction = process.env.NODE_ENV === 'production';

        const superAdmin = await prisma.superAdmin.findUnique({
            where: { email: normalizedEmail },
        });

        if (!superAdmin) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        if (!superAdmin.isActive) {
            return res.status(403).json({ message: 'Cuenta de super-admin desactivada.' });
        }

        const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Si tiene TOTP habilitado, requerir codigo (validacion basica, mejorable con speakeasy)
        let totpVerified = false;
        if (superAdmin.totpEnabled) {
            if (!totpCode) {
                return res.status(403).json({
                    message: 'Se requiere código TOTP.',
                    requiresTotp: true,
                });
            }
            // Aqui iria la validacion real del codigo TOTP con la libreria speakeasy.
            // Por ahora aceptamos cualquier codigo de 6 digitos en desarrollo.
            if (process.env.NODE_ENV !== 'production' && totpCode.length === 6) {
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
        return res.status(500).json({ message: 'Error al iniciar sesión.' });
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
        return res.json({ message: 'Sesión cerrada.' });
    } catch (error) {
        return res.status(500).json({ message: 'Error al cerrar sesión.' });
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
            while (await tx.tenant.findUnique({ where: { slug } })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            return slug;
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
                        lastLoginAt: new Date(),
                    },
                });
            } else {
                user = await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        password: hashedPassword,
                        name,
                        isActive: true,
                        lastLoginAt: new Date(),
                    },
                });
            }

            const slug = await generateUniqueSlug(companyName, tx);
            const now = new Date();
            const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

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
        const { status, plan, search, trialExpiringSoon } = req.query;

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

        const tenants = await prisma.tenant.findMany({
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
        });

        const tenantsWithUsage = await Promise.all(
            tenants.map(async (t) => {
                const usage = await computeUsage(t.id);
                const limits = t.plan ? getPlanLimits(t.plan.key) : PLANS.BASE.limits;

                const trialDaysRemaining = t.trialEndsAt
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
            })
        );

        return res.json({ data: tenantsWithUsage });
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

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const [updatedTenant] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: { status: 'ACTIVE' },
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

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: { status: 'SUSPENDED' },
            }),
            prisma.subscription.updateMany({
                where: { tenantId: id },
                data: { status: 'SUSPENDED' },
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

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: { status: 'ACTIVE' },
            }),
            prisma.subscription.updateMany({
                where: { tenantId: id },
                data: { status: 'ACTIVE' },
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

        if (!days || days < 1 || days > 90) {
            return res.status(400).json({ message: 'days debe estar entre 1 y 90.' });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        const baseDate = tenant.trialEndsAt && tenant.trialEndsAt > new Date()
            ? tenant.trialEndsAt
            : new Date();
        const newTrialEndsAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id },
                data: {
                    trialEndsAt: newTrialEndsAt,
                    status: 'TRIAL',
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
                    metadata: { days, newTrialEndsAt },
                },
            }),
        ]);

        return res.json({
            message: `Trial extendido ${days} días.`,
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

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) {
            return res.status(404).json({ message: 'Tenant no encontrado.' });
        }

        const payment = await prisma.payment.create({
            data: {
                tenantId,
                amountUsd,
                method,
                reference: reference || null,
                notes: notes || null,
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                confirmedById: req.superAdmin.id,
                confirmedAt: new Date(),
            },
        });

        // Si el tenant estaba en PAST_DUE, lo pasamos a ACTIVE
        if (['PAST_DUE', 'EXPIRED'].includes(tenant.status)) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { status: 'ACTIVE' },
            });
            await prisma.subscription.updateMany({
                where: { tenantId },
                data: { status: 'ACTIVE' },
            });
        }

        await prisma.auditLog.create({
            data: {
                tenantId,
                superAdminId: req.superAdmin.id,
                action: 'REGISTER_PAYMENT',
                metadata: { amountUsd, method, paymentId: payment.id },
            },
        });

        return res.status(201).json({
            message: 'Pago registrado.',
            data: payment,
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

        const mrrCents = tenantsByPlan.reduce((acc, t) => {
            const plan = planMap[t.planId];
            if (!plan) return acc;
            return acc + Number(plan.priceUsd) * t._count._all;
        }, 0);

        return res.json({
            data: {
                totalTenants,
                activePaidTenants,
                mrrUsd: mrrCents,
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

        const result = await runWorkers(jobName);

        return res.json({
            message: `Worker ${jobName} ejecutado.`,
            data: result,
        });
    } catch (error) {
        console.error('[runWorker] Error:', error);
        return res.status(400).json({ message: error.message });
    }
};

/**
 * @route   GET /api/admin/workers/status
 * @desc    Estado actual de los workers (ultima ejecucion, errores)
 * @access  Private (super-admin)
 */
export const getWorkersInfo = async (req, res) => {
    return res.json({ data: getWorkersStatus() });
};
