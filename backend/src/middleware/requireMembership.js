/**
 * requireMembership - Valida que el user del JWT pertenezca al tenant activo.
 *
 * Debe usarse DESPUES de verifyToken y tenantResolver.
 *
 * Comportamiento:
 * - Lee el userId del JWT (seteado por verifyToken).
 * - Lee el tenantId del tenant resuelto (seteado por tenantResolver).
 * - Busca la Membership (userId, tenantId).
 * - Si no existe o está SUSPENDED → 403.
 * - Si existe y está ACTIVE → setea req.membership y continúa.
 * - Si está INVITED → 403 (debe aceptar la invitación primero).
 *
 * Setea en req:
 * - membership: { id, role, status }
 * - user: { id, email, name } (para evitar otra query)
 */

import prisma from '../config/database.js';

export const requireMembership = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'No autenticado.' });
        }

        if (!req.tenant || !req.tenant.id) {
            return res.status(400).json({ message: 'Tenant no resuelto.' });
        }

        const membership = await prisma.membership.findUnique({
            where: {
                userId_tenantId: {
                    userId: req.user.id,
                    tenantId: req.tenant.id,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phoneNumber: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!membership) {
            return res.status(403).json({
                message: 'No perteneces a este tenant.',
            });
        }

        if (membership.status === 'SUSPENDED') {
            return res.status(403).json({
                message: 'Tu membresía en este tenant está suspendida.',
            });
        }

        if (membership.status === 'INVITED') {
            return res.status(403).json({
                message: 'Debes aceptar la invitación antes de acceder.',
            });
        }

        if (!membership.user.isActive) {
            return res.status(403).json({
                message: 'Tu usuario está inactivo.',
            });
        }

        req.membership = {
            id: membership.id,
            role: membership.role,
            status: membership.status,
        };

        req.user = {
            ...req.user,
            ...membership.user,
        };

        return next();
    } catch (error) {
        console.error('[requireMembership] Error:', error);
        return res.status(500).json({
            message: 'Error al validar la membresía.',
        });
    }
};
