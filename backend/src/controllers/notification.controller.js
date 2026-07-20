import prisma from '../config/database.js';

/**
 * Crea una notificacion interna (usado por workers y services).
 * Las notificaciones son tenant-scoped, asi que requieren tenantId explicito.
 *
 * @param {Object} data
 * @param {string} data.tenantId - REQUERIDO
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} data.type - INFO | SUCCESS | WARNING | ALARM (default INFO)
 * @param {string} [data.targetUserId] - Si la notificacion es para un user especifico
 * @param {string[]} [data.targetRoles] - Roles destinatarios (OWNER, ADMIN, SALES, OPERATOR, VIEWER)
 * @param {string} [data.entityType] - Tipo de entidad relacionada (ej: 'PAYABLE', 'SHIPMENT')
 * @param {string} [data.entityId] - ID de la entidad relacionada
 */
export const createNotification = async (data) => {
    try {
        const {
            tenantId,
            title,
            message,
            type = 'INFO',
            targetUserId = null,
            targetRoles = [],
            entityType = null,
            entityId = null,
        } = data;

        if (!tenantId) {
            console.error('[createNotification] tenantId es requerido');
            return null;
        }

        return await prisma.notification.create({
            data: {
                tenantId,
                title,
                message,
                type,
                targetUserId,
                targetRoles,
                entityType,
                entityId,
            },
        });
    } catch (error) {
        console.error('Error al crear notificación (interna):', error);
        return null;
    }
};

export const getUnreadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const membershipRole = req.membership?.role;

        const whereConditions = {
            tenantId: req.tenant.id,
            isRead: false,
            OR: [
                { targetUserId: userId },
            ],
        };

        if (membershipRole) {
            whereConditions.OR.push({ targetRoles: { has: membershipRole } });
        }

        // OWNER y ADMIN ven notificaciones globales (sin targetUserId ni roles)
        if (['OWNER', 'ADMIN'].includes(membershipRole)) {
            whereConditions.OR.push({
                AND: [
                    { targetUserId: null },
                    { targetRoles: { isEmpty: true } },
                ],
            });
        }

        const notifications = await prisma.notification.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.json({ data: notifications });
    } catch (error) {
        console.error('Error in getUnreadNotifications:', error);
        res.status(500).json({ message: 'Error al obtener notificaciones' });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await prisma.notification.findFirst({
            where: { id, tenantId: req.tenant.id },
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });

        res.json({ message: 'Marcada como leída', data: updated });
    } catch (error) {
        console.error('Error in markAsRead:', error);
        res.status(500).json({ message: 'Error al marcar como leída' });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const membershipRole = req.membership?.role;

        const whereConditions = {
            tenantId: req.tenant.id,
            isRead: false,
            OR: [
                { targetUserId: userId },
            ],
        };

        if (membershipRole) {
            whereConditions.OR.push({ targetRoles: { has: membershipRole } });
        }

        if (['OWNER', 'ADMIN'].includes(membershipRole)) {
            whereConditions.OR.push({
                AND: [
                    { targetUserId: null },
                    { targetRoles: { isEmpty: true } },
                ],
            });
        }

        const updated = await prisma.notification.updateMany({
            where: whereConditions,
            data: { isRead: true },
        });

        res.json({ message: `${updated.count} notificaciones marcadas como leídas` });
    } catch (error) {
        console.error('Error in markAllAsRead:', error);
        res.status(500).json({ message: 'Error al marcar todas como leídas' });
    }
};
