/**
 * enforcePlanLimits - Middleware que bloquea operaciones si el tenant
 * ha alcanzado el limite del plan.
 *
 * Uso:
 *   router.post('/clients', enforcePlanLimits('users'), clientController.create);
 *
 * Recursos soportados:
 * - 'users': limita la creación de nuevos miembros en el tenant
 * - 'documentsMonth': limita creación de cotizaciones y avisos de cobro
 * - 'shipmentsActive': limita embarques activos (no entregados)
 *
 * Lee los limites desde plans.config.js (cache en memoria, no consulta DB).
 * Cuenta el uso actual con queries optimizadas.
 */

import prisma from '../config/database.js';
import { getPlanLimits } from '../config/plans.config.js';
import { getCurrentTenantId } from '../lib/tenantContext.js';

/**
 * Cuenta el uso actual de un recurso para el tenant activo.
 */
const getCurrentUsage = async (tenantId, resource) => {
    switch (resource) {
        case 'users': {
            return await prisma.membership.count({
                where: { tenantId, status: 'ACTIVE' },
            });
        }
        case 'documentsMonth': {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [quotesNotConverted, paymentNotices] = await Promise.all([
                prisma.quote.count({
                    where: {
                        tenantId,
                        status: { not: 'CONVERTED' },
                        createdAt: { gte: startOfMonth },
                    },
                }),
                prisma.paymentNotice.count({
                    where: {
                        tenantId,
                        createdAt: { gte: startOfMonth },
                    },
                }),
            ]);
            return quotesNotConverted + paymentNotices;
        }
        case 'shipmentsActive': {
            return await prisma.shipment.count({
                where: {
                    tenantId,
                    status: { not: 'DELIVERED' },
                    deletedAt: null,
                },
            });
        }
        default:
            throw new Error(`Recurso no soportado: ${resource}`);
    }
};

/**
 * Factory que devuelve el middleware para un recurso especifico.
 */
export const enforcePlanLimits = (resource) => {
    return async (req, res, next) => {
        try {
            const tenantId = getCurrentTenantId() || req.tenant?.id;
            if (!tenantId) {
                return res.status(400).json({ message: 'Tenant no identificado.' });
            }

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { plan: { select: { key: true } } },
            });

            const planKey = tenant?.plan?.key || 'BASE';
            const limits = getPlanLimits(planKey);

            const limitField = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
            const maxAllowed = limits[limitField];

            if (maxAllowed === undefined || maxAllowed === null) {
                console.warn(`[enforcePlanLimits] Limite no definido para ${resource} en plan ${planKey}`);
                return next();
            }

            const currentUsage = await getCurrentUsage(tenantId, resource);

            if (currentUsage >= maxAllowed) {
                const messages = {
                    users: `Has alcanzado el límite de ${maxAllowed} usuarios del plan ${planKey}. Actualiza tu plan para añadir más.`,
                    documentsMonth: `Has alcanzado el límite de ${maxAllowed} documentos este mes del plan ${planKey}. Actualiza tu plan o espera al próximo mes.`,
                    shipmentsActive: `Has alcanzado el límite de ${maxAllowed} embarques activos del plan ${planKey}. Cierra embarques entregados o actualiza tu plan.`,
                };

                return res.status(403).json({
                    message: messages[resource] || `Límite alcanzado: ${resource}.`,
                    limit: maxAllowed,
                    currentUsage,
                    planKey,
                });
            }

            return next();
        } catch (error) {
            console.error('[enforcePlanLimits] Error:', error);
            return res.status(500).json({
                message: 'Error al validar límites del plan.',
            });
        }
    };
};

/**
 * Helper para verificar features (white-label, multi-moneda, etc.).
 * Devuelve true si el plan del tenant permite la feature.
 */
export const checkFeatureAccess = async (tenantId, featureName) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: { select: { key: true } } },
    });

    const planKey = tenant?.plan?.key || 'BASE';

    const { getPlanFeatures } = await import('../config/plans.config.js');
    const features = getPlanFeatures(planKey);

    return features[featureName] === true;
};
