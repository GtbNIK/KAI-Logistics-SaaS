/**
 * tenantResolver - Middleware que identifica el tenant del request.
 *
 * Lee el slug del tenant desde:
 * 1. Header `X-Tenant-Slug` (desarrollo y testing con Postman/Thunder Client)
 * 2. Subdominio (produccion: slug.kai-logistics.app) - se activa en Fase 5
 *
 * Si encuentra el tenant:
 * - Lo setea en req.tenant
 * - Ejecuta el resto del request dentro de un AsyncLocalStorage
 *   con el tenantId, para que la Prisma Extension filtre automaticamente.
 *
 * Si el tenant esta EXPIRED o CANCELLED: bloquea con 403 + codigo especifico.
 * Si esta TRIAL: marca `req.tenant.isReadOnly = true` (modo demo, sin escrituras).
 *
 * IMPORTANTE: Este middleware NO autentica al usuario.
 * Siempre debe ir acompanado de `verifyToken` y `requireMembership`.
 */

import prisma from '../config/database.js';
import { runWithTenant } from '../lib/tenantContext.js';

/**
 * Lee el slug del tenant desde el header o subdominio.
 */
const extractTenantSlug = (req) => {
    const headerSlug = req.headers['x-tenant-slug'];
    if (headerSlug && typeof headerSlug === 'string') {
        return headerSlug.trim().toLowerCase();
    }

    const host = req.headers.host || req.hostname || '';
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');

    if (parts.length >= 3) {
        const firstPart = parts[0].toLowerCase();
        const reservedSubdomains = ['www', 'admin', 'app', 'api', 'mail'];
        if (!reservedSubdomains.includes(firstPart)) {
            return firstPart;
        }
    }

    return null;
};

/**
 * Factory: crea el middleware de tenant resolver.
 *
 * Opciones:
 * - optional: si es true, no falla si no hay tenant (rutas publicas)
 * - allowExpired: si es true, permite el paso a tenants EXPIRED (modo lectura)
 */
export const tenantResolver = ({ optional = false, allowExpired = false } = {}) => {
    return async (req, res, next) => {
        try {
            const slug = extractTenantSlug(req);

            if (!slug) {
                if (optional) {
                    return next();
                }
                return res.status(400).json({
                    message: 'Tenant no identificado. Envia el header X-Tenant-Slug o accede desde tu subdominio.',
                });
            }

            const tenant = await prisma.tenant.findUnique({
                where: { slug },
                include: {
                    plan: true,
                    subscription: true,
                    settings: true,
                },
            });

            if (!tenant) {
                return res.status(404).json({
                    message: `Tenant "${slug}" no encontrado.`,
                });
            }

            // Tenant bloqueado (suspendido o cancelado): acceso denegado total
            const blockedStatuses = ['SUSPENDED', 'CANCELLED'];
            if (blockedStatuses.includes(tenant.status)) {
                return res.status(403).json({
                    code: 'TENANT_BLOCKED',
                    status: tenant.status,
                    message: `El tenant "${tenant.name}" esta ${tenant.status.toLowerCase()}. Contacta al administrador.`,
                });
            }

            // Tenant con trial vencido: bloqueado salvo que se pida allowExpired
            if (tenant.status === 'EXPIRED' && !allowExpired) {
                return res.status(403).json({
                    code: 'TENANT_EXPIRED',
                    status: 'EXPIRED',
                    trialEndsAt: tenant.trialEndsAt,
                    message: 'Tu periodo de prueba ha vencido. Contacta al equipo de KAI para activar tu suscripcion.',
                });
            }

            // Si esta en TRIAL, es modo demo (read-only)
            const isReadOnly = tenant.status === 'TRIAL' || tenant.status === 'EXPIRED';

            req.tenant = {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                status: tenant.status,
                isReadOnly,
                planKey: tenant.plan?.key || null,
                plan: tenant.plan,
                subscription: tenant.subscription,
                settings: tenant.settings,
            };

            return runWithTenant(tenant.id, () => next());
        } catch (error) {
            console.error('[tenantResolver] Error:', error);
            return res.status(500).json({
                message: 'Error al resolver el tenant.',
            });
        }
    };
};
