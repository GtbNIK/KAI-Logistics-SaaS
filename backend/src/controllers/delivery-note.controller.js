import prisma from '../config/database.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DELIVERY_NOTE_INCLUDE = {
    client: { select: { name: true, rifOrId: true } },
    quote: { select: { number: true } },
    items: true,
    paymentNotice: { select: { id: true, number: true } }
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
            where.client = { assignedToId: req.user.id };
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
                    { client: { assignedToId: req.user.id } },
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
                client: true,
                quote: { select: { number: true } },
                items: true,
                paymentNotice: {
                    select: {
                        id: true,
                        number: true,
                        receivable: { select: { id: true, status: true, balance: true } }
                    }
                }
            }
        });

        if (!note || note.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        // Restricción SALES
        if (req.user.role === 'SALES' && note.client.assignedToId !== req.user.id) {
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
        const { clientId, quoteId, deliveredTo, deliveryAddress, notes, items } = req.body;

        if (!clientId) {
            return res.status(400).json({ message: 'El cliente es obligatorio' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Debe incluir al menos un item' });
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
                deliveryAddress: deliveryAddress || null,
                notes: notes || null,
                items: {
                    create: items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
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
        const { clientId, deliveredTo, deliveryAddress, notes, items } = req.body;

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

            return tx.deliveryNote.update({
                where: { id },
                data: {
                    clientId: clientId || existing.clientId,
                    deliveredTo: deliveredTo ?? existing.deliveredTo,
                    deliveryAddress: deliveryAddress ?? existing.deliveryAddress,
                    notes: notes ?? existing.notes,
                    items: {
                        create: (items || []).map(item => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
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
        const { id } = req.params;
        const { adjustedItems, notes: finalNotes } = req.body;

        const existing = await prisma.deliveryNote.findUnique({
            where: { id },
            include: { items: true, paymentNotice: true, client: true }
        });

        if (!existing || existing.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        if (existing.status === 'DELIVERED') {
            return res.status(400).json({ message: 'Esta nota ya fue entregada y tiene su aviso de cobro generado' });
        }

        if (existing.paymentNotice) {
            return res.status(400).json({ message: 'Esta nota ya tiene un aviso de cobro asociado' });
        }

        // Usar items ajustados si se pasan, si no usar los originales
        const finalItems = adjustedItems && adjustedItems.length > 0 ? adjustedItems : existing.items;
        const totalAmount = finalItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Si hay items ajustados, actualizar los items de la nota
            if (adjustedItems && adjustedItems.length > 0) {
                await tx.deliveryNoteItem.deleteMany({ where: { deliveryNoteId: id } });
                await tx.deliveryNoteItem.createMany({
                    data: adjustedItems.map(item => ({
                        deliveryNoteId: id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice
                    }))
                });
            }

            // 2. Marcar como DELIVERED
            await tx.deliveryNote.update({
                where: { id },
                data: {
                    status: 'DELIVERED',
                    notes: finalNotes ?? existing.notes
                }
            });

            // 3. Crear PaymentNotice
            const paymentNotice = await tx.paymentNotice.create({
                data: {
                    deliveryNoteId: id,
                    clientId: existing.clientId,
                    totalAmount,
                    notes: finalNotes ?? existing.notes,
                    items: {
                        create: finalItems.map(item => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
                        }))
                    }
                }
            });

            // 4. Crear Receivable (Cuenta por cobrar)
            await tx.receivable.create({
                data: {
                    paymentNoticeId: paymentNotice.id,
                    clientId: existing.clientId,
                    totalAmount,
                    paidAmount: 0,
                    balance: totalAmount,
                    status: 'PENDING'
                }
            });

            return paymentNotice;
        });

        res.status(201).json({
            message: 'Nota de entrega finalizada. Aviso de cobro y cuenta por cobrar generados exitosamente.',
            paymentNotice: result
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
            where: { id },
            include: { paymentNotice: true }
        });

        if (!existing || existing.deletedAt) {
            return res.status(404).json({ message: 'Nota de entrega no encontrada' });
        }

        if (existing.status === 'DELIVERED') {
            return res.status(400).json({ message: 'No se puede eliminar una nota ya entregada' });
        }

        if (existing.paymentNotice) {
            return res.status(400).json({ message: 'No se puede eliminar una nota con aviso de cobro asociado' });
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
