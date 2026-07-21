/**
 * Client Controller - Multi-Tenant.
 *
 * Refactorizado para usar Prisma Client Extension (scoping automatico por tenant)
 * y Membership-based authorization (roles por tenant, no globales).
 *
 * NOTA: Mantiene la misma API que el controller legacy para no romper el frontend.
 * Los campos `assignedUsers` y `updatedBy` ya no existen en el modelo multi-tenant
 * (porque todos los miembros del tenant ven los clientes segun su rol en Membership).
 */

import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';
import { getScopeFilter, SCOPE_FIELD_MAP, SCOPE_RELATION_MAP } from '../utils/scope.js';

const normalizeRifOrId = (rifOrId) => {
    if (!rifOrId) return '';
    return rifOrId.replace(/[-\s]/g, '').toUpperCase().trim();
};

const normalizePhone = (phone) => String(phone || '');

const slugifyInternalCode = (text) => {
    return text.toString().toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 12);
};

/**
 * Genera el siguiente internalCode (CLI-XXXX) dentro del tenant actual.
 * Usa una transaccion para evitar colisiones en concurrencia.
 */
const generateInternalCode = async (tx) => {
    const lastClient = await tx.client.findFirst({
        where: { internalCode: { startsWith: 'CLI-' } },
        orderBy: { internalCode: 'desc' },
        select: { internalCode: true },
    });

    let nextNumber = 1;
    if (lastClient) {
        const match = lastClient.internalCode.match(/CLI-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `CLI-${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * Verifica si el membership actual tiene rol de administrador.
 */
const isAdmin = (req) => {
    return ['OWNER', 'ADMIN'].includes(req.membership?.role);
};

/**
 * @route   POST /api/clients
 * @desc    Crea un cliente en el tenant activo
 * @access  Private (ADMIN, SALES, OPERATOR)
 */
export const createClient = async (req, res) => {
    try {
        const {
            name,
            rifOrId,
            email,
            phone,
            address,
            deliveryAddress,
            contactPerson,
            referencePoint,
            clientDetails,
            assignedUserIds,
        } = req.body;

        const assigneeIds = Array.isArray(assignedUserIds) ? assignedUserIds.filter(Boolean) : [];

        if (!name || !rifOrId || !email || !phone || !address || !deliveryAddress || !contactPerson) {
            return res.status(400).json({
                message: 'Faltan campos requeridos: name, rifOrId, email, phone, address, deliveryAddress, contactPerson.',
            });
        }

        const normalizedRifOrId = normalizeRifOrId(rifOrId);
        const normalizedPhone = normalizePhone(phone);

        // Verificar duplicados dentro del tenant (la Extension ya filtra por tenantId)
        const existingClient = await prisma.client.findFirst({
            where: {
                OR: [
                    { rifOrId: normalizedRifOrId },
                    { email },
                    { phone: normalizedPhone },
                ],
            },
        });

        if (existingClient) {
            let field = 'datos';
            if (existingClient.rifOrId === normalizedRifOrId) field = 'RIF/Cédula';
            else if (existingClient.email === email) field = 'Email';
            else if (existingClient.phone === normalizedPhone) field = 'Teléfono';

            return res.status(400).json({
                message: `Ya existe un cliente con ese ${field}.`,
            });
        }

        const client = await prisma.$transaction(async (tx) => {
            const internalCode = await generateInternalCode(tx);

            const created = await tx.client.create({
                data: {
                    internalCode,
                    name,
                    rifOrId: normalizedRifOrId,
                    email,
                    phone: normalizedPhone,
                    address,
                    deliveryAddress,
                    contactPerson,
                    referencePoint: referencePoint || null,
                    clientDetails: clientDetails || null,
                    deletedAt: null,
                },
            });

            if (assigneeIds.length > 0) {
                await tx.clientAssignment.createMany({
                    data: assigneeIds.map(userId => ({
                        clientId: created.id,
                        userId,
                    })),
                });
            }

            return created;
        });

        return res.status(201).json(client);
    } catch (error) {
        console.error('[createClient] Error:', error);

        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0];
            let fieldName = 'datos';
            if (field === 'rifOrId') fieldName = 'RIF/Cédula';
            else if (field === 'email') fieldName = 'Email';
            else if (field === 'phone') fieldName = 'Teléfono';
            else if (field === 'internalCode') fieldName = 'código interno';

            return res.status(400).json({
                message: `Ya existe un cliente con ese ${fieldName}.`,
            });
        }

        return res.status(500).json({
            message: 'Error al crear cliente.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * @route   GET /api/clients
 * @desc    Lista clientes del tenant activo con paginacion y busqueda
 * @access  Private (todos los miembros del tenant)
 */
export const getClients = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            all = 'false',
            includeInactive = 'false',
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

const where = {
        deletedAt: null,
        ...getScopeFilter(req.membership.role, req.user.id, SCOPE_FIELD_MAP, SCOPE_RELATION_MAP, 'Client'),
    };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        if (all === 'true') {
            const clients = await prisma.client.findMany({
                where,
                orderBy: { name: 'asc' },
                include: {
                    clientAssignments: { select: { userId: true, user: { select: { id: true, name: true, position: true } } } },
                },
            });
            return res.json({ data: clients });
        }

        const total = await prisma.client.count({ where });

        const clients = await prisma.client.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                clientAssignments: { select: { userId: true, user: { select: { id: true, name: true, position: true } } } },
            },
        });

        return res.json({
            data: clients,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take),
            },
        });
    } catch (error) {
        console.error('[getClients] Error:', error);
        return res.status(500).json({ message: 'Error al obtener clientes.' });
    }
};

/**
 * @route   GET /api/clients/:id
 * @desc    Obtiene un cliente por ID (del tenant activo)
 * @access  Private
 */
export const getClient = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findFirst({
            where: {
                id,
                ...getScopeFilter(req.membership.role, req.user.id, SCOPE_FIELD_MAP, SCOPE_RELATION_MAP, 'Client'),
            },
            include: {
                clientAssignments: { select: { userId: true, user: { select: { id: true, name: true, position: true } } } },
            },
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        return res.json(client);
    } catch (error) {
        console.error('[getClient] Error:', error);
        return res.status(500).json({ message: 'Error al obtener cliente.' });
    }
};

/**
 * @route   PUT /api/clients/:id
 * @desc    Actualiza un cliente del tenant activo
 * @access  Private (ADMIN, SALES, OPERATOR)
 */
export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            rifOrId,
            email,
            phone,
            address,
            deliveryAddress,
            contactPerson,
            referencePoint,
            clientDetails,
            assignedUserIds,
        } = req.body;

        const existingClient = await prisma.client.findFirst({ where: { id } });
        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        const normalizedRifOrId = rifOrId !== undefined ? normalizeRifOrId(rifOrId) : existingClient.rifOrId;
        const normalizedPhone = phone !== undefined ? normalizePhone(phone) : existingClient.phone;

        const rifChanged = normalizedRifOrId !== existingClient.rifOrId;
        const emailChanged = email !== undefined && email !== existingClient.email;
        const phoneChanged = normalizedPhone !== existingClient.phone;

        if (rifChanged || emailChanged || phoneChanged) {
            const orConditions = [];
            if (rifChanged) orConditions.push({ rifOrId: normalizedRifOrId });
            if (emailChanged) orConditions.push({ email });
            if (phoneChanged) orConditions.push({ phone: normalizedPhone });

            const duplicate = await prisma.client.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        { OR: orConditions },
                    ],
                },
            });

            if (duplicate) {
                let field = 'datos';
                if (rifChanged && duplicate.rifOrId === normalizedRifOrId) field = 'RIF/Cédula';
                else if (emailChanged && duplicate.email === email) field = 'Email';
                else if (phoneChanged && duplicate.phone === normalizedPhone) field = 'Teléfono';

                return res.status(400).json({
                    message: `Ya existe otro cliente con ese ${field}.`,
                });
            }
        }

        const updatedClient = await prisma.$transaction(async (tx) => {
            const updated = await tx.client.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(rifOrId !== undefined && { rifOrId: normalizedRifOrId }),
                    ...(email !== undefined && { email }),
                    ...(phone !== undefined && { phone: normalizedPhone }),
                    ...(address !== undefined && { address }),
                    ...(deliveryAddress !== undefined && { deliveryAddress }),
                    ...(contactPerson !== undefined && { contactPerson }),
                    ...(referencePoint !== undefined && { referencePoint }),
                    ...(clientDetails !== undefined && { clientDetails }),
                },
            });

            // Reemplazar asignaciones si vienen en el payload
            if (assignedUserIds !== undefined) {
                const newIds = Array.isArray(assignedUserIds) ? assignedUserIds.filter(Boolean) : [];
                await tx.clientAssignment.deleteMany({ where: { clientId: id } });
                if (newIds.length > 0) {
                    await tx.clientAssignment.createMany({
                        data: newIds.map(userId => ({ clientId: id, userId })),
                    });
                }
            }

            return updated;
        });

        return res.json(updatedClient);
    } catch (error) {
        console.error('[updateClient] Error:', error);
        return res.status(500).json({ message: 'Error al actualizar cliente.' });
    }
};

/**
 * @route   DELETE /api/clients/:id
 * @desc    Soft delete de un cliente
 * @access  Private (solo OWNER/ADMIN)
 */
export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isAdmin(req)) {
            return res.status(403).json({
                message: 'Solo administradores pueden eliminar clientes.',
            });
        }

        const client = await prisma.client.findFirst({ where: { id } });
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        await prisma.client.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        return res.json({ message: 'Cliente eliminado correctamente.' });
    } catch (error) {
        console.error('[deleteClient] Error:', error);
        return res.status(500).json({ message: 'Error al eliminar cliente.' });
    }
};

/**
 * @route   PATCH /api/clients/:id/toggle-status
 * @desc    Activa/desactiva un cliente
 * @access  Private (OWNER, ADMIN, SALES, OPERATOR)
 */
export const toggleClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { deactivationNote } = req.body || {};

        const existingClient = await prisma.client.findFirst({
            where: { id },
            select: { isActive: true },
        });

        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        const willBeActive = !existingClient.isActive;

        const updatedClient = await prisma.client.update({
            where: { id },
            data: {
                isActive: willBeActive,
                deactivationNote: willBeActive ? null : deactivationNote || null,
            },
        });

        return res.json({
            message: `Cliente ${updatedClient.isActive ? 'activado' : 'inactivado'} correctamente.`,
            client: updatedClient,
        });
    } catch (error) {
        console.error('[toggleClientStatus] Error:', error);
        return res.status(500).json({ message: 'Error al cambiar estado del cliente.' });
    }
};

/**
 * @route   GET /api/clients/:id/receivables-summary
 * @desc    Resumen de cuentas por cobrar del cliente
 * @access  Private
 */
export const getClientReceivablesSummary = async (req, res) => {
    try {
        const { id } = req.params;

        const client = await prisma.client.findFirst({
            where: { id },
            select: { id: true, creditBalance: true },
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }

        const [activeCount, totalBalance] = await Promise.all([
            prisma.receivable.count({
                where: {
                    clientId: id,
                    status: { in: ['PENDING', 'PARTIALLY_PAID'] },
                },
            }),
            prisma.receivable.aggregate({
                where: {
                    clientId: id,
                    status: { in: ['PENDING', 'PARTIALLY_PAID'] },
                },
                _sum: { balance: true },
            }),
        ]);

        return res.json({
            activeCount,
            totalPendingBalance: totalBalance._sum.balance || 0,
            creditBalance: client.creditBalance ? Number(client.creditBalance) : 0,
        });
    } catch (error) {
        console.error('[getClientReceivablesSummary] Error:', error);
        return res.status(500).json({ message: 'Error al obtener resumen de cuentas por cobrar.' });
    }
};
