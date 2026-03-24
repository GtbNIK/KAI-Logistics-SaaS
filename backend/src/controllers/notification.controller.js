import prisma from '../config/database.js';

export const createNotification = async (data) => {
    try {
        const { title, message, type, targetUserId, targetRoles, entityType, entityId } = data;
        
        return await prisma.notification.create({
            data: {
                title,
                message,
                type: type || 'INFO',
                targetUserId: targetUserId || null,
                targetRoles: targetRoles || [],
                entityType: entityType || null,
                entityId: entityId || null
            }
        });
    } catch (error) {
        console.error('Error al crear notificación (interna):', error);
        return null; // Silent catch for background tasks
    }
};

export const getUnreadNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role; // ADMIN or SALES

        const whereConditions = {
            isRead: false,
            OR: [
                { targetUserId: userId },
                { targetRoles: { has: userRole } }
            ]
        };

        // Si es ADMIN, también ve aquellas globales (sin target ni rol)
        if (userRole === 'ADMIN') {
            whereConditions.OR.push({
                AND: [
                    { targetUserId: null },
                    { targetRoles: { isEmpty: true } }
                ]
            });
        }

        const notifications = await prisma.notification.findMany({
            where: whereConditions,
            orderBy: { createdAt: 'desc' },
            take: 50 // Limitando a las últimas 50
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
        
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json({ message: 'Marcada como leída', data: updated });
    } catch (error) {
        console.error('Error in markAsRead:', error);
        res.status(500).json({ message: 'Error al marcar notificación' });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        const whereConditions = {
            isRead: false,
            OR: [
                { targetUserId: userId },
                { targetRoles: { has: userRole } }
            ]
        };

        if (userRole === 'ADMIN') {
            whereConditions.OR.push({
                AND: [
                    { targetUserId: null },
                    { targetRoles: { isEmpty: true } }
                ]
            });
        }

        const updated = await prisma.notification.updateMany({
            where: whereConditions,
            data: { isRead: true }
        });

        res.json({ message: `${updated.count} notificaciones marcadas como leídas` });
    } catch (error) {
        console.error('Error in markAllAsRead:', error);
        res.status(500).json({ message: 'Error al marcar notificaciones' });
    }
};
