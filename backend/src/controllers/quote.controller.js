import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';
import { calculateItemSubtotal } from '../utils/pricing.js';

// GET /api/quotes - Listar cotizaciones
export const getQuotes = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, clientId, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};

        // Filtro por rol (SALES solo ve sus propias cotizaciones)
        if (req.user.role === 'SALES') {
            where.userId = req.user.id;
        }

        // Búsqueda por número, cliente o vendedor
        if (search) {
            const parsed = parseInt(search, 10);
            const isNumber = !Number.isNaN(parsed);
            where.OR = [
                { client: { name: { contains: search, mode: 'insensitive' } } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                ...(isNumber ? [{ number: parsed }] : [])
            ];
        }

        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const [quotes, total] = await Promise.all([
            prisma.quote.findMany({
                where,
                include: {
                client: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true } },
                    _count: { select: { items: true } }
                },
                orderBy: { number: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.quote.count({ where })
        ]);

        res.json({
            data: quotes,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting quotes:', error);
        res.status(500).json({ message: 'Error al obtener cotizaciones' });
    }
};

// GET /api/quotes/:id - Detalle de cotización
export const getQuote = async (req, res) => {
    try {
        const { id } = req.params;

        const quote = await prisma.quote.findUnique({
            where: { id },
            include: {
                client: {
                    include: {
                        assignedUsers: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                user: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        service: true,
                        ally: true,
                        zone: true,
                        shippingLine: true,
                        airLine: true
                    }
                }
            }
        });

        if (!quote) {
            return res.status(404).json({ message: 'Cotización no encontrada' });
        }

        // Verificar permisos
        if (req.user.role === 'SALES' && quote.userId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para ver esta cotización' });
        }
        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la cotización' });
    }
};

// POST /api/quotes - Crear cotización
export const createQuote = async (req, res) => {
    try {
        const { clientId, validUntil, notes, items } = req.body;
        const userId = req.user.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'La cotización debe tener al menos un ítem' });
        }

        // Calcular totales
        let totalAmount = 0;
        const quoteItems = await Promise.all(items.map(async (item) => {
            const quantity = parseFloat(item.quantity) || 1;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            
            // Obtener el tipo de servicio para aplicar reglas de pricing
            const service = await prisma.service.findUnique({
                where: { id: item.serviceId },
                select: { type: true }
            });
            
            const totalPrice = calculateItemSubtotal(service?.type, quantity, unitPrice);
            totalAmount += totalPrice;

            return {
                serviceId: item.serviceId,
                allyId: item.allyId || null,
                zoneId: item.zoneId || null,
                originPort: item.originPort || null,
                destinationPort: item.destinationPort || null,
                shippingLineId: item.shippingLineId || null,
                airLineId: item.airLineId || null,
                quantity,
                unitPrice,
                totalPrice,
                description: item.description
            };
        }));

        // Crear cotización con transacción implícita de Prisma
        const quote = await prisma.quote.create({
            data: {
                clientId,
                userId,
                validUntil: validUntil ? new Date(validUntil) : null,
                notes,
                totalAmount,
                status: 'DRAFT',
                items: {
                    create: quoteItems
                }
            },
            include: {
                items: true,
                client: true
            }
        });

        // Crear notificación para administradores
        await createNotification({
            title: 'Nueva Cotización',
            message: `Cotización #${quote.number} creada para el cliente ${quote.client.name} por un total de $${totalAmount.toFixed(2)}.`,
            type: 'INFO',
            targetRoles: ['ADMIN'],
            entityType: 'QUOTE',
            entityId: quote.id
        });

        res.status(201).json(quote);
    } catch (error) {
        console.error('Error creating quote:', error);
        res.status(500).json({ message: 'Error al crear la cotización' });
    }
};

// PUT /api/quotes/:id - Actualizar cotización
export const updateQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, validUntil, notes, items } = req.body;

        const existingQuote = await prisma.quote.findUnique({ where: { id } });

        if (!existingQuote) {
            return res.status(404).json({ message: 'Cotización no encontrada' });
        }

        // Verificar permisos y estado
        if (req.user.role === 'SALES' && existingQuote.userId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para editar esta cotización' });
        }

        if (existingQuote.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Solo se pueden editar cotizaciones en borrador' });
        }

        // Si se actualizan items, recalcular todo
        if (items) {
            // Calcular nuevos totales... esto es complejo porque implica borrar/crear items
            // Para simplificar V1: Borramos items anteriores y creamos los nuevos
            // En un sistema real de producción querríamos upserts inteligentes, pero esto funciona bien para cotizaciones pequeñas

            let totalAmount = 0;
            const quoteItems = await Promise.all(items.map(async (item) => {
                const quantity = parseFloat(item.quantity) || 1;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                
                // Obtener el tipo de servicio para aplicar reglas de pricing
                const service = await prisma.service.findUnique({
                    where: { id: item.serviceId },
                    select: { type: true }
                });
                
                const totalPrice = calculateItemSubtotal(service?.type, quantity, unitPrice);
                totalAmount += totalPrice;
                
                return {
                    serviceId: item.serviceId,
                    allyId: item.allyId || null,
                    zoneId: item.zoneId || null,
                    originPort: item.originPort || null,
                    destinationPort: item.destinationPort || null,
                    shippingLineId: item.shippingLineId || null,
                    airLineId: item.airLineId || null,
                    quantity,
                    unitPrice,
                    totalPrice,
                    description: item.description
                };
            }));

            // Usamos una transacción
            const updatedQuote = await prisma.$transaction(async (tx) => {
                // 1. Borrar items viejos
                await tx.quoteItem.deleteMany({ where: { quoteId: id } });

                // 2. Actualizar header y crear items nuevos
                return await tx.quote.update({
                    where: { id },
                    data: {
                        clientId,
                        validUntil: validUntil ? new Date(validUntil) : null,
                        notes,
                        totalAmount,
                        items: {
                            create: quoteItems
                        }
                    },
                    include: {
                        items: true
                    }
                });
            });

            return res.json(updatedQuote);
        } else {
            // Solo actualización de cabecera
            const quote = await prisma.quote.update({
                where: { id },
                data: {
                    clientId,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    notes
                }
            });
            return res.json(quote);
        }

    } catch (error) {
        console.error('Error updating quote:', error);
        res.status(500).json({ message: 'Error al actualizar la cotización' });
    }
};

// PATCH /api/quotes/:id/status - Cambiar estado
export const updateQuoteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const quote = await prisma.quote.findUnique({ where: { id } });
        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        // Validaciones de transición (ej. no puedes pasar de REJECTED a DRAFT directamente sin lógica extra, etc)
        // Por ahora permitimos libre albedrío pero restringimos por rol si fuera necesario

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: { status },
            include: { client: true }
        });

        if (status === 'APPROVED' && quote.status !== 'APPROVED') {
            await createNotification({
                title: 'Cotización Aprobada',
                message: `La cotización COT-${String(updatedQuote.number).padStart(5, '0')} para el cliente ${updatedQuote.client.name} ha sido aprobada!.`,
                type: 'SUCCESS',
                targetRoles: ['ADMIN'],
                entityType: 'QUOTE',
                entityId: updatedQuote.id
            });
        }

        res.json(updatedQuote);
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Error al cambiar estado' });
    }
};

// DELETE /api/quotes/:id - Eliminar
export const deleteQuote = async (req, res) => {
    try {
        const { id } = req.params;
        const quote = await prisma.quote.findUnique({ where: { id } });

        if (!quote) return res.status(404).json({ message: 'Cotización no encontrada' });

        if (quote.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Solo se pueden eliminar borradores' });
        }

        if (req.user.role === 'SALES' && quote.userId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso' });
        }

        await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
        await prisma.quote.delete({ where: { id } });

        res.json({ message: 'Cotización eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting quote:', error);
        res.status(500).json({ message: 'Error al eliminar cotización' });
    }
};
// GET /api/quotes/next-number - Obtener el próximo número de cotización
export const getNextQuoteNumber = async (req, res) => {
    try {
        const lastQuote = await prisma.quote.findFirst({
            orderBy: { number: 'desc' },
            select: { number: true }
        });
        const nextNumber = (lastQuote?.number || 0) + 1;
        res.json({ nextNumber });
    } catch (error) {
        console.error('Error fetching next quote number:', error);
        res.status(500).json({ error: 'Error fetching next quote number' });
    }
};
