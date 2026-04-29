import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DELIVERY_NOTE_INCLUDE = {
    client: { select: { name: true, rifOrId: true } },
    quote: { select: { number: true } },
    items: true
};

// ─── GET /api/delivery-notes ─────────────────────────────────────────────────
export const getDeliveryNotes = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const isSales = req.user.role === 'SALES';

        const where = { deletedAt: null };

        // Filtrar por clientes asignados si es vendedor
        if (isSales) {
            where.client = { assignedUsers: { some: { id: req.user.id } } };
        }

        // Filtro por estado
        if (status) {
            where.status = status;
        }

        // Búsqueda
        if (search) {
            const searchConditions = {
                OR: [
                    { client: { name: { contains: search, mode: 'insensitive' } } },
                    { number: { equals: parseInt(search) || undefined } },
                    { deliveredTo: { contains: search, mode: 'insensitive' } }
                ]
            };

            if (isSales) {
                where.AND = [
                    { client: { assignedUsers: { some: { id: req.user.id } } } },
                    searchConditions
                ];
                delete where.client;
            } else {
                Object.assign(where, searchConditions);
            }
        }

        const [notes, total] = await Promise.all([
            prisma.deliveryNote.findMany({
                where,
                include: DELIVERY_NOTE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.deliveryNote.count({ where })
        ]);

        res.json({
            data: notes,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getDeliveryNotes:', error);
        res.status(500).json({ message: 'Error al obtener notas de entrega' });
    }
};

// ─── GET /api/delivery-notes/:id ─────────────────────────────────────────────
export const getDeliveryNoteById = async (req, res) => {
    try {
        const { id } = req.params;

        const note = await prisma.deliveryNote.findUnique({
            where: { id },
            include: {
                client: { include: { assignedUsers: { select: { id: true } } } },
                quote: { select: { number: true } },
                items: true,
            }
        });

        if (!note || note.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        // Restricción SALES
        if (req.user.role === 'SALES' && !note.client.assignedUsers.some(u => u.id === req.user.id)) {
            return res.status(403).json({ message: 'No tienes acceso a esta nota de entrega' });
        }

        res.json(note);
    } catch (error) {
        console.error('Error in getDeliveryNoteById:', error);
        res.status(500).json({ message: 'Error al obtener nota de entrega' });
    }
};

// ─── POST /api/delivery-notes ────────────────────────────────────────────────
export const createDeliveryNote = async (req, res) => {
    try {
        const { clientId, quoteId, deliveredTo, contactPhone, deliveryAddress, warehouseNumber, notes, items } = req.body;

        if (!clientId) {
            return res.status(400).json({ message: 'El cliente es obligatorio' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Debe incluir al menos un item' });
        }

		if (!warehouseNumber) {
			return res.status(400).json({ message: 'El número de Warehouse es obligatorio' });
		}

        // Verificar que el cliente exista
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        const note = await prisma.deliveryNote.create({
            data: {
                clientId,
                quoteId: quoteId || null,
                deliveredTo: deliveredTo || null,
                contactPhone: contactPhone || null,
                deliveryAddress: deliveryAddress || null,
				warehouseNumber,
                notes: notes || null,
                items: {
                    create: items.map(item => ({
						d2dItemId: item.d2dItemId || null,
                        description: item.description,
                        quantity: item.quantity,
						weight: item.weight ?? null,
						cbm: item.cbm ?? null
                    }))
                }
            },
            include: DELIVERY_NOTE_INCLUDE
        });

        res.status(201).json(note);
    } catch (error) {
        console.error('Error in createDeliveryNote:', error);
        res.status(500).json({ message: 'Error al crear nota de entrega' });
    }
};

// ─── PUT /api/delivery-notes/:id ─────────────────────────────────────────────
export const updateDeliveryNote = async (req, res) => {
    try {
        const { id } = req.params;
		const { clientId, deliveredTo, contactPhone, deliveryAddress, warehouseNumber, notes, items } = req.body;

        const existing = await prisma.deliveryNote.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        if (existing.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Solo se pueden editar notas en estado Borrador' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            // Eliminar items existentes y recrear
            await tx.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: id } });

            return await tx.deliveryNote.update({
                where: { id },
                data: {
                    clientId: clientId ?? existing.clientId,
                    deliveredTo: deliveredTo ?? existing.deliveredTo,
                    contactPhone: contactPhone ?? existing.contactPhone,
                    deliveryAddress: deliveryAddress ?? existing.deliveryAddress,
					warehouseNumber: warehouseNumber ?? existing.warehouseNumber,
                    notes: notes ?? existing.notes,
                    items: {
                        create: (items || []).map(item => ({
							d2dItemId: item.d2dItemId || null,
                            description: item.description,
                            quantity: item.quantity,
							weight: item.weight ?? null,
							cbm: item.cbm ?? null
                        }))
                    }
                },
                include: DELIVERY_NOTE_INCLUDE
            });
        });

        res.json(updated);
    } catch (error) {
        console.error('Error in updateDeliveryNote:', error);
        res.status(500).json({ message: 'Error al actualizar nota de entrega' });
    }
};

// ─── PATCH /api/delivery-notes/:id/status ────────────────────────────────────
export const updateDeliveryNoteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado no válido' });
        }

        const existing = await prisma.deliveryNote.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        // Restricciones de flujo
        if (existing.status === 'DELIVERED') {
            return res.status(400).json({ message: 'No se puede cambiar el estado de una nota ya entregada' });
        }
        if (existing.status === 'CANCELLED') {
            return res.status(400).json({ message: 'No se puede cambiar el estado de una nota cancelada' });
        }

        const updated = await prisma.deliveryNote.update({
            where: { id },
            data: { status },
            include: DELIVERY_NOTE_INCLUDE
        });

        res.json(updated);
    } catch (error) {
        console.error('Error in updateDeliveryNoteStatus:', error);
        res.status(500).json({ message: 'Error al actualizar estado' });
    }
};

// ─── POST /api/delivery-notes/:id/finalize ───────────────────────────────────
// Transacción: marca como DELIVERED + genera PaymentNotice + Receivable
export const finalizeDeliveryNote = async (req, res) => {
    try {
        return res.status(400).json({
			message: 'Las Notas de Entrega ya no generan Aviso de Cobro ni Cuentas por Cobrar.'
		});
    } catch (error) {
        console.error('Error in finalizeDeliveryNote:', error);
        res.status(500).json({ message: 'Error al finalizar nota de entrega' });
    }
};

// ─── DELETE /api/delivery-notes/:id (soft delete) ────────────────────────────
export const deleteDeliveryNote = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.deliveryNote.findUnique({
            where: { id }
        });

        if (!existing || existing.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        if (existing.status === 'DELIVERED') {
            return res.status(400).json({ message: 'No se puede eliminar una nota ya entregada' });
        }

        await prisma.deliveryNote.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Nota de entrega eliminada correctamente' });
    } catch (error) {
        console.error('Error in deleteDeliveryNote:', error);
        res.status(500).json({ message: 'Error al eliminar nota de entrega' });
    }
};
