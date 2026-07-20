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
 * Si no encuentra el tenant:
 * - Retorna 400 (rutas tenant-scoped) o continua sin tenant (rutas publicas/admin).
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
    // 1. Header explicito (dev, testing)
    const headerSlug = req.headers['x-tenant-slug'];
    if (headerSlug && typeof headerSlug === 'string') {
        return headerSlug.trim().toLowerCase();
    }

    // 2. Subdominio (prod)
    const host = req.headers.host || req.hostname || '';
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');

    // Estructura esperada: slug.kai-logistics.app
    // Si hay 3+ partes y la primera NO es "www" ni "admin" ni "app"
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
 */
export const tenantResolver = ({ optional = false } = {}) => {
    return async (req, res, next) => {
        try {
            const slug = extractTenantSlug(req);

            if (!slug) {
                if (optional) {
                    return next();
                }
                return res.status(400).json({
                    message: 'Tenant no identificado. Envía el header X-Tenant-Slug o accede desde tu subdominio.',
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

            // Seteamos el tenant en req para acceso directo en controllers
            req.tenant = {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                status: tenant.status,
                planKey: tenant.plan?.key || null,
                plan: tenant.plan,
                subscription: tenant.subscription,
                settings: tenant.settings,
            };

            // Si el tenant está suspendido, expirado o cancelado, bloqueamos
            const blockedStatuses = ['SUSPENDED', 'CANCELLED'];
            if (blockedStatuses.includes(tenant.status)) {
                return res.status(403).json({
                    message: `El tenant "${tenant.name}" está ${tenant.status.toLowerCase()}. Contacta al administrador.`,
                });
            }

            // Si está expirado (trial), permitimos login pero no escritura
            // (esto se valida despues con enforcePlanLimits o un guard especifico)

            // Ejecutamos el resto del request dentro del tenant context
            // para que Prisma Extension filtre automaticamente.
            return runWithTenant(tenant.id, () => next());
        } catch (error) {
            console.error('[tenantResolver] Error:', error);
            return res.status(500).json({
                message: 'Error al resolver el tenant.',
            });
        }
    };
};
