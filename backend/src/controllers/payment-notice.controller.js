import prisma from '../config/database.js';
import { getScopeFilter, SCOPE_FIELD_MAP } from '../utils/scope.js';
import { calculateItemSubtotal } from '../utils/pricing.js';

const VALID_CURRENCIES = ['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CNY'];

const parseRouteFromDescription = (description = '') => {
    const match = description.match(/Ruta:\s*(.+?)\s*→\s*(.+?)(?:\s*·|$)/);
    if (!match) {
        return { originPort: '', destinationPort: '' };
    }

    const normalize = (value) => {
        const trimmed = value.trim();
        return trimmed === 'N/A' ? '' : trimmed;
    };

    return {
        originPort: normalize(match[1]),
        destinationPort: normalize(match[2])
    };
};

/**
 * @route   DELETE /api/payment-notices/:id
 * @desc    Eliminar un aviso de cobro y su cuenta por cobrar asociada
 * @access  Private (ADMIN only)
 */
export const deletePaymentNotice = async (req, res) => {
    try {
        const { id } = req.params;

        const notice = await prisma.paymentNotice.findUnique({
            where: { id },
            include: {
                receivable: {
                    include: { payments: { select: { id: true } } }
                }
            }
        });

        if (!notice) {
            return res.status(404).json({ message: 'Aviso de Cobro no encontrado' });
        }

        await prisma.$transaction(async (tx) => {
            // Si tiene receivable con pagos, eliminar en cascada recibos y pagos
            if (notice.receivable) {
                if (notice.receivable.payments.length > 0) {
                    const paymentIds = notice.receivable.payments.map(p => p.id);
                    await tx.paymentReceipt.deleteMany({
                        where: { paymentTransactionId: { in: paymentIds } }
                    });
                    await tx.paymentTransaction.deleteMany({
                        where: { id: { in: paymentIds } }
                    });
                }
                await tx.receivable.delete({ where: { id: notice.receivable.id } });
            }

            // Eliminar items del aviso
            await tx.paymentNoticeItem.deleteMany({ where: { paymentNoticeId: id } });

            // Si el aviso viene de una cotización, revertir su estado
            if (notice.quoteId) {
                await tx.quote.update({
                    where: { id: notice.quoteId },
                    data: { status: 'APPROVED' }
                });
            }

            await tx.paymentNotice.delete({ where: { id } });
        });

        res.json({ message: 'Aviso de Cobro eliminado correctamente' });
    } catch (error) {
        console.error('Error in deletePaymentNotice:', error);
        res.status(500).json({ message: 'Error al eliminar el Aviso de Cobro' });
    }
};

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
                        ally:    { select: { internalCode: true } },
                        zone:    { select: { name: true } },
                        shippingLine: { select: { name: true } },
                        airLine: { select: { name: true } }
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

        // Obtener saldo a favor del cliente
        const clientData = await prisma.client.findUnique({
            where: { id: quote.clientId },
            select: { creditBalance: true }
        });
        const creditAvailable = clientData ? Number(clientData.creditBalance) : 0;
        const appliedCredit = Math.min(creditAvailable, Number(quote.totalAmount));
        const remainingAmount = Number(quote.totalAmount) - appliedCredit;

        // 2. Transacción de base de datos para asegurar integridad
        const result = await prisma.$transaction(async (tx) => {
            // A. Crear PaymentNotice y PaymentNoticeItems
            const paymentNotice = await tx.paymentNotice.create({
                data: {
                    quoteId: quote.id,
                    clientId: quote.clientId,
                    totalAmount: quote.totalAmount,
                    currency: quote.currency || 'USD',
                    notes: quote.notes,
                    items: {
                        create: quote.items.map(item => {
                            // Construir descripción rica: "Servicio · Aliado · Línea · Zona/Ruta"
                            const parts = [];
                            if (item.service?.name)   parts.push(item.service.name);
                            if (item.ally?.internalCode) parts.push(`Aliado: ${item.ally.internalCode}`);
                            if (item.shippingLine?.name) parts.push(`Línea Naviera: ${item.shippingLine.name}`);
                            if (item.airLine?.name) parts.push(`Línea Aérea: ${item.airLine.name}`);
                            if (item.zone?.name)      parts.push(`Zona: ${item.zone.name}`);
                            if (item.originPort || item.destinationPort) {
                                parts.push(`Ruta: ${item.originPort || 'N/A'} → ${item.destinationPort || 'N/A'}`);
                            }
                            const description = item.description || parts.join(' · ') || 'Servicio de Logística';
                            return {
                                serviceId:      item.serviceId,
                                allyId:         item.allyId || null,
                                zoneId:         item.zoneId || null,
                                shippingLineId: item.shippingLineId || null,
                                airLineId:      item.airLineId || null,
                                description,
                                quantity:   item.quantity,
                                unitPrice:  item.unitPrice,
                                totalPrice: item.totalPrice
                            };
                        })
                    }
                }
            });

            // B. Crear Receivable (Cuenta por cobrar) aplicando saldo a favor si existe
            const receivable = await tx.receivable.create({
                data: {
                    paymentNoticeId: paymentNotice.id,
                    clientId: quote.clientId,
                    totalAmount: quote.totalAmount,
                    currency: quote.currency || 'USD',
                    paidAmount: appliedCredit,
                    balance: remainingAmount,
                    status: remainingAmount <= 0 ? 'PAID' : 'PENDING'
                }
            });

            // C. Si se aplicó crédito, registrar transacción y actualizar saldo a favor
            if (appliedCredit > 0) {
                await tx.paymentTransaction.create({
                    data: {
                        receivableId: receivable.id,
                        amount: appliedCredit,
                        method: 'CREDIT_BALANCE',
                        notes: `Saldo a favor aplicado automáticamente ($${appliedCredit.toFixed(2)})`
                    }
                });

                await tx.client.update({
                    where: { id: quote.clientId },
                    data: { creditBalance: { decrement: appliedCredit } }
                });
            }

            // D. Actualizar estado de la cotización
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
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.membership.role);

        let where = {};

        if (!isPrivileged) {
            where.client = { clientAssignments: { some: { userId: req.user.id } } };
        }

        if (search) {
            const searchConditions = {
                OR: [
                    { client: { name: { contains: search, mode: 'insensitive' } } },
                    { number: { equals: parseInt(search) || undefined } }
                ]
            };
            where = isPrivileged
                ? searchConditions
                : { AND: [{ client: { clientAssignments: { some: { userId: req.user.id } } } }, searchConditions] };
        }

        const isAdmin = isPrivileged;

        const [notices, total] = await Promise.all([
            prisma.paymentNotice.findMany({
                where,
                include: {
                    client: { select: { name: true } },
                    quote: { select: { number: true } },
                    items: true,
                    ...(isAdmin ? { receivable: { select: { id: true, number: true, status: true, balance: true, paidAmount: true } } } : {}),
                    tracking: { select: { id: true } }
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
        const isPrivileged = ['OWNER', 'ADMIN'].includes(req.membership.role);

        const notice = await prisma.paymentNotice.findFirst({
            where: {
                id,
                ...(isPrivileged ? {} : { client: { clientAssignments: { some: { userId: req.user.id } } } }),
            },
            include: {
                client: { select: { name: true, rifOrId: true } },
                items: {
                    include: {
                        service: { select: { name: true, type: true } },
                        ally: { select: { name: true } },
                        shippingLine: true,
                        airLine: true
                    }
                },
                quote: {
                    select: { number: true }
                },
                ...(isPrivileged ? {
                    receivable: {
                        include: {
                            payments: {
                                orderBy: { date: 'desc' }
                            }
                        }
                    }
                } : {})
            }
        });

        if (!notice) {
            return res.status(404).json({ message: 'Aviso de Cobro no encontrado' });
        }

        const noticeWithRouteInfo = {
            ...notice,
            items: notice.items.map(item => {
                const { originPort, destinationPort } = parseRouteFromDescription(item.description || '');
                return {
                    ...item,
                    originPort,
                    destinationPort
                };
            })
        };

        res.json(noticeWithRouteInfo);
    } catch (error) {
        console.error('Error in getPaymentNoticeById:', error);
        res.status(500).json({ message: 'Error al obtener aviso de cobro' });
    }
};

/**
 * @route   PUT /api/payment-notices/:id
 * @desc    Actualizar un Aviso de Cobro existente
 * @access  Private (ADMIN only)
 */
export const updatePaymentNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, items, notes, currency } = req.body;
        const noticeCurrency = currency && VALID_CURRENCIES.includes(currency) ? currency : undefined;

        if (!clientId) return res.status(400).json({ message: 'El cliente es requerido' });
        if (!items || !Array.isArray(items) || items.length === 0)
            return res.status(400).json({ message: 'Debe incluir al menos un servicio' });

        const notice = await prisma.paymentNotice.findUnique({
            where: { id },
            include: { receivable: { select: { id: true, paidAmount: true } } }
        });
        if (!notice) return res.status(404).json({ message: 'Aviso de Cobro no encontrado' });

        if (notice.receivable?.status === 'PAID') {
            return res.status(400).json({ message: 'El Aviso de Cobro ya está pagado y no se puede editar.' });
        }

        const processedItems = [];
        let totalAmount = 0;

        for (const item of items) {
            if (!item.serviceId) return res.status(400).json({ message: 'Cada item debe tener un servicio seleccionado' });

            const quantity = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || 0;

            const service = await prisma.service.findUnique({
                where: { id: item.serviceId },
                select: { name: true, type: true }
            });

            const totalPrice = calculateItemSubtotal(service?.type, quantity, unitPrice);
            totalAmount += totalPrice;

            const ally = item.allyId
                ? await prisma.ally.findUnique({ where: { id: item.allyId }, select: { internalCode: true } })
                : null;
            const zone = item.zoneId
                ? await prisma.zone.findUnique({ where: { id: item.zoneId }, select: { name: true } })
                : null;
            const shippingLine = item.shippingLineId
                ? await prisma.shippingLine.findUnique({ where: { id: item.shippingLineId }, select: { name: true } })
                : null;
            const airLine = item.airLineId
                ? await prisma.airLine.findUnique({ where: { id: item.airLineId }, select: { name: true } })
                : null;

            const parts = [];
            if (service?.name) parts.push(service.name);
            if (ally?.internalCode) parts.push(`Aliado: ${ally.internalCode}`);
            if (shippingLine?.name) parts.push(`Línea Naviera: ${shippingLine.name}`);
            if (airLine?.name) parts.push(`Línea Aérea: ${airLine.name}`);
            if (zone?.name) parts.push(`Zona: ${zone.name}`);
            if (item.originPort || item.destinationPort) {
                parts.push(`Ruta: ${item.originPort || 'N/A'} → ${item.destinationPort || 'N/A'}`);
            }
            const description = item.description || parts.join(' · ') || 'Servicio de Logística';

            processedItems.push({
                serviceId: item.serviceId,
                allyId: item.allyId || null,
                zoneId: item.zoneId || null,
                shippingLineId: item.shippingLineId || null,
                airLineId: item.airLineId || null,
                description,
                quantity,
                unitPrice,
                totalPrice
            });
        }

        if (totalAmount <= 0) return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });

        const result = await prisma.$transaction(async (tx) => {
            await tx.paymentNoticeItem.deleteMany({ where: { paymentNoticeId: id } });

            const updated = await tx.paymentNotice.update({
                where: { id },
                data: {
                    clientId,
                    totalAmount,
                    ...(noticeCurrency ? { currency: noticeCurrency } : {}),
                    notes: notes || null,
                    items: { create: processedItems }
                },
                include: {
                    client: { select: { name: true, rifOrId: true } },
                    items: true
                }
            });

            if (notice.receivable) {
                const paidAmount = parseFloat(notice.receivable.paidAmount) || 0;
                const newBalance = totalAmount - paidAmount;
                await tx.receivable.update({
                    where: { id: notice.receivable.id },
                    data: {
                        clientId,
                        totalAmount,
                        ...(noticeCurrency ? { currency: noticeCurrency } : {}),
                        balance: newBalance < 0 ? 0 : newBalance,
                        status: newBalance <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING'
                    }
                });
            }

            return updated;
        });

        res.json({ message: 'Aviso de Cobro actualizado exitosamente', paymentNotice: result });

    } catch (error) {
        console.error('Error in updatePaymentNotice:', error);
        res.status(500).json({ message: 'Error al actualizar Aviso de Cobro', error: error.message });
    }
};

/**
 * @route   POST /api/payment-notices
 * @desc    Crear un Aviso de Cobro directamente (sin cotización)
 * @access  Private
 */
export const createPaymentNotice = async (req, res) => {
    try {
        const { clientId, items, notes, currency } = req.body;
        const noticeCurrency = currency && VALID_CURRENCIES.includes(currency) ? currency : 'USD';

        // Validaciones
        if (!clientId) {
            return res.status(400).json({ message: 'El cliente es requerido' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Debe incluir al menos un servicio' });
        }

        // Verificar que el cliente existe
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Procesar items y calcular total
        const processedItems = [];
        let totalAmount = 0;

        for (const item of items) {
            if (!item.serviceId) {
                return res.status(400).json({ message: 'Cada item debe tener un servicio seleccionado' });
            }

            const quantity = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || 0;

            // Buscar nombres para la descripción enriquecida y obtener tipo de servicio
            const service = await prisma.service.findUnique({
                where: { id: item.serviceId },
                select: { name: true, type: true }
            });
            
            // Calcular totalPrice usando la lógica de pricing
            const totalPrice = calculateItemSubtotal(service?.type, quantity, unitPrice);
            totalAmount += totalPrice;

            const ally = item.allyId
                ? await prisma.ally.findUnique({ where: { id: item.allyId }, select: { internalCode: true } })
                : null;

            const zone = item.zoneId
                ? await prisma.zone.findUnique({ where: { id: item.zoneId }, select: { name: true } })
                : null;

            const shippingLine = item.shippingLineId
                ? await prisma.shippingLine.findUnique({ where: { id: item.shippingLineId }, select: { name: true } })
                : null;

            const airLine = item.airLineId
                ? await prisma.airLine.findUnique({ where: { id: item.airLineId }, select: { name: true } })
                : null;

            // Construir descripción enriquecida: "Servicio · Aliado · Línea · Zona/Ruta"
            const parts = [];
            if (service?.name) parts.push(service.name);
            if (ally?.internalCode) parts.push(`Aliado: ${ally.internalCode}`);
            if (shippingLine?.name) parts.push(`Línea Naviera: ${shippingLine.name}`);
            if (airLine?.name) parts.push(`Línea Aérea: ${airLine.name}`);
            if (zone?.name) parts.push(`Zona: ${zone.name}`);
            if (item.originPort || item.destinationPort) {
                parts.push(`Ruta: ${item.originPort || 'N/A'} → ${item.destinationPort || 'N/A'}`);
            }
            const description = item.description || parts.join(' · ') || 'Servicio de Logística';

            processedItems.push({
                serviceId: item.serviceId,
                allyId: item.allyId || null,
                zoneId: item.zoneId || null,
                shippingLineId: item.shippingLineId || null,
                airLineId: item.airLineId || null,
                description,
                quantity,
                unitPrice,
                totalPrice
            });
        }

        if (totalAmount <= 0) {
            return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });
        }

        // Obtener saldo a favor del cliente
        const clientBal = await prisma.client.findUnique({
            where: { id: clientId },
            select: { creditBalance: true }
        });
        const creditAvail = clientBal ? Number(clientBal.creditBalance) : 0;
        const appliedCredit = Math.min(creditAvail, totalAmount);
        const remainingAmount = totalAmount - appliedCredit;

        // Transacción: crear PaymentNotice + Items + Receivable
        const result = await prisma.$transaction(async (tx) => {
            const paymentNotice = await tx.paymentNotice.create({
                data: {
                    clientId,
                    totalAmount,
                    currency: noticeCurrency,
                    notes: notes || null,
                    items: {
                        create: processedItems
                    }
                },
                include: {
                    client: { select: { name: true, rifOrId: true } },
                    items: true
                }
            });

            // Crear Receivable asociado, aplicando saldo a favor si existe
            const receivable = await tx.receivable.create({
                data: {
                    paymentNoticeId: paymentNotice.id,
                    clientId,
                    totalAmount,
                    currency: noticeCurrency,
                    paidAmount: appliedCredit,
                    balance: remainingAmount,
                    status: remainingAmount <= 0 ? 'PAID' : 'PENDING'
                }
            });

            // Si se aplicó crédito, registrar transacción y actualizar saldo a favor
            if (appliedCredit > 0) {
                await tx.paymentTransaction.create({
                    data: {
                        receivableId: receivable.id,
                        amount: appliedCredit,
                        method: 'CREDIT_BALANCE',
                        notes: `Saldo a favor aplicado automáticamente ($${appliedCredit.toFixed(2)})`
                    }
                });

                await tx.client.update({
                    where: { id: clientId },
                    data: { creditBalance: { decrement: appliedCredit } }
                });
            }

            return paymentNotice;
        });

        res.status(201).json({
            message: 'Aviso de Cobro creado exitosamente',
            paymentNotice: result
        });

    } catch (error) {
        console.error('Error in createPaymentNotice:', error);
        res.status(500).json({ message: 'Error al crear Aviso de Cobro', error: error.message });
    }
};
