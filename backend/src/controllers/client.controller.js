import { PrismaClient } from '@prisma/client';
import { createNotification } from './notification.controller.js';

// Usar global.prisma si ya existe para evitar múltiples conexiones en dev
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Normalizar RIF/Cédula: eliminar guiones, espacios y convertir a mayúsculas
const normalizeRifOrId = (rifOrId) => {
    if (!rifOrId) return '';
    return rifOrId.replace(/[-\s]/g, '').toUpperCase().trim();
};

// Generar código interno automático (ej. CLI-0001)
const generateInternalCode = async () => {
    // Obtener TODOS los códigos existentes
    const allClients = await prisma.client.findMany({
        select: { internalCode: true }
    });
    
    if (!allClients || allClients.length === 0) return 'CLI-0001';
    
    // Extraer los números de todos los códigos y encontrar el máximo
    const numbers = allClients
        .map(client => {
            const match = client.internalCode.match(/CLI-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        })
        .filter(num => !isNaN(num));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `CLI-${nextNumber.toString().padStart(4, '0')}`;
};

export const createClient = async (req, res) => {
    try {
        const { name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint, clientDetails, assignedToIds } = req.body;
        
        // Normalizar RIF/Cédula
        const normalizedRifOrId = normalizeRifOrId(rifOrId);
        
        // Verificar duplicados
        const existingClient = await prisma.client.findFirst({
            where: { 
                OR: [
                    { rifOrId: normalizedRifOrId },
                    { email },
                    { phone }
                ]
            }
        });

        if (existingClient) {
            let field = 'datos';
            if (existingClient.rifOrId === normalizedRifOrId) field = 'RIF/Cédula';
            else if (existingClient.email === email) field = 'Email';
            else if (existingClient.phone === phone) field = 'Teléfono';
            
            return res.status(400).json({ 
                message: `Ya existe un cliente con ese ${field}` 
            });
        }

        const internalCode = await generateInternalCode();
        
        // Si no se proporciona assignedToIds o si es SALES, usar el usuario actual
        let finalAssignedToIds = [];
        if (req.user.role === 'SALES') {
            finalAssignedToIds = [req.user.id];
        } else {
            finalAssignedToIds = (assignedToIds && Array.isArray(assignedToIds) && assignedToIds.length > 0) 
                                 ? assignedToIds 
                                 : [req.user.id];
        }

        const client = await prisma.client.create({
            data: {
                internalCode,
                name,
                rifOrId: normalizedRifOrId,
                email,
                phone,
                address,
                deliveryAddress,
                contactPerson,
                referencePoint,
                clientDetails,
                assignedUsers: {
                    connect: finalAssignedToIds.map(id => ({ id }))
                },
                updatedById: req.user.id
            },
            include: {
                assignedUsers: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { name: true, email: true } }
            }
        });

        // Notificar a los vendedores de la asignación del nuevo cliente
        for (const userId of finalAssignedToIds) {
            if (userId !== req.user.id) { // Solo notificar si se lo asignamos a otra persona
                await createNotification({
                    title: 'Nuevo Cliente Asignado',
                    message: `Se ha creado y se te ha asignado el cliente ${client.name} (${client.internalCode}).`,
                    type: 'INFO',
                    targetUserId: userId,
                    entityType: 'CLIENT',
                    entityId: client.id
                });
            }
        }

        res.status(201).json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        
        // Errores específicos de Prisma
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0];
            let fieldName = 'datos';
            if (field === 'rifOrId') fieldName = 'RIF/Cédula';
            else if (field === 'email') fieldName = 'Email';
            else if (field === 'phone') fieldName = 'Teléfono';
            else if (field === 'internalCode') fieldName = 'código interno';
            
            return res.status(400).json({ 
                message: `Ya existe un cliente con ese ${fieldName}` 
            });
        }
        
        res.status(500).json({ 
            message: 'Error al crear cliente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getClients = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', all = 'false', includeInactive = 'false', assignedToId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const isSales = req.user.role === 'SALES';

        // Filtro de búsqueda
        const where = {
            deletedAt: null, // Excluir eliminados (soft delete)
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } }
            ]
        };

        // Filtrar por activos/inactivos
        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        // SALES siempre ve solo sus clientes. ADMIN puede filtrar por vendedor
        if (isSales) {
            where.assignedUsers = { some: { id: req.user.id } };
        } else if (assignedToId) {
            where.assignedUsers = { some: { id: assignedToId } };
        }

        // Si all=true, devolver sin paginación (para selects)
        if (all === 'true') {
             const clients = await prisma.client.findMany({
                where,
                orderBy: { name: 'asc' },
                include: {
                    assignedUsers: { select: { id: true, name: true, email: true } },
                    updatedBy: { select: { name: true, email: true } }
                }
            });
            return res.json({ data: clients });
        }

        // Conteo total para paginación
        const total = await prisma.client.count({ where });

        const clients = await prisma.client.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedUsers: {
                    select: { id: true, name: true, email: true }
                },
                updatedBy: { select: { name: true, email: true } }
            }
        });

        res.json({
            data: clients,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};

export const getClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                assignedUsers: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { name: true, email: true } }
            }
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Seguridad: Si es ventas, verificar que sea suyo
        if (req.user.role === 'SALES' && !client.assignedUsers.some(u => u.id === req.user.id)) {
            return res.status(403).json({ message: 'No tienes permiso para ver este cliente' });
        }

        res.json(client);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener cliente' });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint, clientDetails, assignedToIds } = req.body;

        // Normalizar RIF/Cédula
        const normalizedRifOrId = normalizeRifOrId(rifOrId);

        const existingClient = await prisma.client.findUnique({ 
            where: { id },
            include: { assignedUsers: { select: { id: true } } }
        });
        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Seguridad: SALES puede editar clientes
        if (req.user.role === 'SALES' && !existingClient.assignedUsers.some(u => u.id === req.user.id)) {
            return res.status(403).json({ message: 'No tienes permiso para editar este cliente' });
        }

        // Verificar duplicados SOLO si los valores cambiaron
        const rifChanged = normalizedRifOrId !== existingClient.rifOrId;
        const emailChanged = email !== existingClient.email;
        const phoneChanged = phone !== existingClient.phone;

        if (rifChanged || emailChanged || phoneChanged) {
            const orConditions = [];
            if (rifChanged) orConditions.push({ rifOrId: normalizedRifOrId });
            if (emailChanged) orConditions.push({ email });
            if (phoneChanged) orConditions.push({ phone });

            const duplicate = await prisma.client.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        { OR: orConditions }
                    ]
                }
            });

            if (duplicate) {
                let field = 'datos';
                if (rifChanged && duplicate.rifOrId === normalizedRifOrId) field = 'RIF/Cédula';
                else if (emailChanged && duplicate.email === email) field = 'Email';
                else if (phoneChanged && duplicate.phone === phone) field = 'Teléfono';
                
                return res.status(400).json({ 
                    message: `Ya existe otro cliente con ese ${field}` 
                });
            }
        }

        let assignedUsersData = undefined;
        if (req.user.role === 'ADMIN' && assignedToIds !== undefined) {
             // Si pasaron un array (incluso vacío), actualizamos
             if (Array.isArray(assignedToIds)) {
                 assignedUsersData = {
                     set: assignedToIds.map(id => ({ id }))
                 };
             }
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: {
                name,
                rifOrId: normalizedRifOrId,
                email,
                phone,
                address,
                deliveryAddress,
                contactPerson,
                referencePoint,
                clientDetails,
                ...(assignedUsersData ? { assignedUsers: assignedUsersData } : {}),
                updatedById: req.user.id
            },
            include: {
                assignedUsers: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { name: true, email: true } }
            }
        });

        // Notificar a nuevos vendedores si hubo cambio en la asignación
        if (req.user.role === 'ADMIN' && assignedToIds !== undefined && Array.isArray(assignedToIds)) {
            const oldUserIds = existingClient.assignedUsers.map(u => u.id);
            const newAssignedIds = assignedToIds.filter(id => !oldUserIds.includes(id));
            
            for (const userId of newAssignedIds) {
                if (userId !== req.user.id) {
                    await createNotification({
                        title: 'Nuevo Cliente Asignado',
                        message: `Se te ha asignado el cliente ${updatedClient.name} (${updatedClient.internalCode}).`,
                        type: 'INFO',
                        targetUserId: userId,
                        entityType: 'CLIENT',
                        entityId: updatedClient.id
                    });
                }
            }
        }

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error al actualizar cliente' });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Solo administradores pueden eliminar clientes' });
        }

        // Soft delete: marcar como eliminado
        await prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
};

export const toggleClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { deactivationNote } = req.body; // Nota opcional al desactivar
        
        const existingClient = await prisma.client.findUnique({ 
            where: { id },
            select: { isActive: true, assignedUsers: { select: { id: true } } }
        });

        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Seguridad: Ventas solo puede cambiar estado de sus clientes
        if (req.user.role === 'SALES' && !existingClient.assignedUsers.some(u => u.id === req.user.id)) {
            return res.status(403).json({ message: 'No tienes permiso para modificar este cliente' });
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: { 
                isActive: !existingClient.isActive,
                // Solo guardar deactivationNote si se está desactivando
                deactivationNote: !existingClient.isActive ? null : deactivationNote || null
            }
        });

        res.json({ 
            message: `Cliente ${updatedClient.isActive ? 'activado' : 'inactivado'} correctamente`,
            client: updatedClient
        });
    } catch (error) {
        console.error('Error toggling client status:', error);
        res.status(500).json({ message: 'Error al cambiar estado del cliente' });
    }
};

/**
 * @route   GET /api/clients/:id/receivables-summary
 * @desc    Obtener resumen de cuentas por cobrar activas de un cliente
 * @access  Private (ADMIN, SALES)
 */
export const getClientReceivablesSummary = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar acceso SALES: solo puede ver sus clientes
        if (req.user.role === 'SALES') {
            const client = await prisma.client.findUnique({ 
                where: { id }, 
                select: { assignedUsers: { select: { id: true } } } 
            });
            if (!client || !client.assignedUsers.some(u => u.id === req.user.id)) {
                return res.status(403).json({ message: 'No tienes acceso a este cliente' });
            }
        }

        // Contar receivables activas (no pagadas completamente)
        const [activeCount, totalBalance] = await Promise.all([
            prisma.receivable.count({
                where: {
                    clientId: id,
                    status: { in: ['PENDING', 'PARTIALLY_PAID'] }
                }
            }),
            prisma.receivable.aggregate({
                where: {
                    clientId: id,
                    status: { in: ['PENDING', 'PARTIALLY_PAID'] }
                },
                _sum: { balance: true }
            })
        ]);

        res.json({
            activeCount,
            totalPendingBalance: totalBalance._sum.balance || 0
        });
    } catch (error) {
        console.error('Error in getClientReceivablesSummary:', error);
        res.status(500).json({ message: 'Error al obtener resumen de cuentas por cobrar' });
    }
};

