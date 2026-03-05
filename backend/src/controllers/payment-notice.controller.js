import prisma from '../config/database.js';

/**
 * @route   POST /api/payment-notices/from-quote/:id
 * @desc    Generar un Aviso de Cobro a partir de una Cotización Aprobada
 * @access  Private
 */
export const convertFromQuote = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Verificar cotización
        const quote = await prisma.quote.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        service: { select: { name: true, type: true } },
                        ally:    { select: { name: true } },
                        zone:    { select: { name: true } }
                    }
                }
            }
        });

        if (!quote) {
            return res.status(404).json({ message: 'Cotización no encontrada' });
        }

        if (quote.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Solo las cotizaciones APROBADAS pueden convertirse en Aviso de Cobro' });
        }

        // Verificar si ya tiene aviso de cobro
        const existingNotice = await prisma.paymentNotice.findUnique({
            where: { quoteId: id }
        });

        if (existingNotice) {
            return res.status(400).json({ message: 'Esta cotización ya tiene un Aviso de Cobro generado', paymentNoticeId: existingNotice.id });
        }

        // 2. Transacción de base de datos para asegurar integridad
        const result = await prisma.$transaction(async (tx) => {
            // A. Crear PaymentNotice y PaymentNoticeItems
            const paymentNotice = await tx.paymentNotice.create({
                data: {
                    quoteId: quote.id,
                    clientId: quote.clientId,
                    totalAmount: quote.totalAmount,
                    notes: quote.notes,
                    items: {
                        create: quote.items.map(item => {
                            // Construir descripción rica: "Servicio · Aliado · Zona/Ruta"
                            const parts = [];
                            if (item.service?.name)   parts.push(item.service.name);
                            if (item.ally?.name)      parts.push(`Aliado: ${item.ally.name}`);
                            if (item.zone?.name)      parts.push(`Zona: ${item.zone.name}`);
                            if (item.originPort || item.destinationPort) {
                                parts.push(`Ruta: ${item.originPort || 'N/A'} → ${item.destinationPort || 'N/A'}`);
                            }
                            const description = item.description || parts.join(' · ') || 'Servicio de Logística';
                            return {
                                description,
                                quantity:   item.quantity,
                                unitPrice:  item.unitPrice,
                                totalPrice: item.totalPrice
                            };
                        })
                    }
                }
            });

            // B. Crear Receivable (Cuenta por cobrar)
            await tx.receivable.create({
                data: {
                    paymentNoticeId: paymentNotice.id,
                    clientId: quote.clientId,
                    totalAmount: quote.totalAmount,
                    paidAmount: 0,
                    balance: quote.totalAmount,
                    status: 'PENDING'
                }
            });

            // C. Actualizar estado de la cotización
            await tx.quote.update({
                where: { id: quote.id },
                data: { status: 'CONVERTED' }
            });

            return paymentNotice;
        });

        res.status(201).json({
            message: 'Aviso de Cobro generado exitosamente',
            paymentNotice: result
        });

    } catch (error) {
        console.error('Error in convertFromQuote:', error);
        res.status(500).json({ message: 'Error al generar Aviso de Cobro', error: error.message });
    }
};

/**
 * @route   GET /api/payment-notices
 * @desc    Obtener lista de avisos de cobro con búsqueda y paginación
 * @access  Private
 */
export const getPaymentNotices = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const isSales = req.user.role === 'SALES';

        let where = {};

        // Si es SALES, solo ver avisos de sus clientes asignados
        if (isSales) {
            where.client = { assignedToId: req.user.id };
        }

        if (search) {
            const searchConditions = {
                OR: [
                    { client: { name: { contains: search, mode: 'insensitive' } } },
                    { number: { equals: parseInt(search) || undefined } }
                ]
            };
            // Combinar filtro de SALES con búsqueda
            where = isSales
                ? { AND: [{ client: { assignedToId: req.user.id } }, searchConditions] }
                : searchConditions;
        }

        const [notices, total] = await Promise.all([
            prisma.paymentNotice.findMany({
                where,
                include: {
                    client: { select: { name: true, rifOrId: true } },
                    quote: { select: { number: true } },
                    items: true,
                    receivable: { select: { id: true, status: true, balance: true, paidAmount: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.paymentNotice.count({ where })
        ]);

        res.json({
            data: notices,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getPaymentNotices:', error);
        res.status(500).json({ message: 'Error al obtener avisos de cobro' });
    }
};

/**
 * @route   GET /api/payment-notices/:id
 * @desc    Obtener un aviso de cobro específico con items y pagos
 * @access  Private
 */
export const getPaymentNoticeById = async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await prisma.paymentNotice.findUnique({
            where: { id },
            include: {
                client: true,
                items: true,
                quote: {
                    select: { number: true }
                },
                receivable: {
                    include: {
                        payments: {
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            }
        });

        if (!notice) {
            return res.status(404).json({ message: 'Aviso de Cobro no encontrado' });
        }

        // Si es rol de ventas, verificar que el aviso pertenezca a un cliente asignado
        if (req.user.role === 'SALES' && notice.client.assignedToId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permisos para ver el aviso de cobro de este cliente' });
        }

        res.json(notice);
    } catch (error) {
        console.error('Error in getPaymentNoticeById:', error);
        res.status(500).json({ message: 'Error al obtener aviso de cobro' });
    }
};
