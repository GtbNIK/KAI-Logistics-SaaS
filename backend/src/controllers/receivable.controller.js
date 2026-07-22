import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';
import { formatCurrency } from '../utils/currency.js';

const VALID_CURRENCIES = ['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CNY'];

export const createReceivable = async (req, res) => {
    try {
        const { clientId, totalAmount, manualNotes, currency } = req.body;
        const recCurrency = currency && VALID_CURRENCIES.includes(currency) ? currency : 'USD';

        if (!clientId) {
            return res.status(400).json({ message: 'El cliente es requerido' });
        }

        const amount = Number(totalAmount);
        if (!totalAmount || Number.isNaN(amount) || amount < 0) {
            return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });
        }

        // Aplicar saldo a favor del cliente automáticamente
        const client = await prisma.client.findFirst({
            where: { id: clientId },
            select: { creditBalance: true }
        });

        const creditAvailable = client ? Number(client.creditBalance) : 0;
        const appliedCredit = Math.min(creditAvailable, amount);
        const remainingAmount = amount - appliedCredit;

        // Generar número secuencial de cuenta por cobrar por tenant
        const lastRec = await prisma.receivable.findFirst({
            where: { tenantId: req.tenant.id },
            orderBy: { number: 'desc' },
            select: { number: true }
        });
        const nextRecNumber = (lastRec?.number || 0) + 1;

        const receivable = await prisma.receivable.create({
            data: {
                paymentNoticeId: null,
                number: nextRecNumber,
                tenantId: req.tenant.id,
                clientId,
                totalAmount: amount,
                currency: recCurrency,
                paidAmount: appliedCredit,
                balance: remainingAmount,
                status: remainingAmount <= 0 ? 'PAID' : 'PENDING',
                manualNotes: manualNotes || null
            }
        });

        // Si se aplicó crédito, registrar transacción y actualizar saldo a favor
        if (appliedCredit > 0) {
            await prisma.$transaction(async (tx) => {
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
            });
        }

        const created = await prisma.receivable.findFirst({
            where: { id: receivable.id },
            include: {
                client: { select: { name: true, rifOrId: true, creditBalance: true } },
                paymentNotice: {
                    select: {
                        number: true,
                        issueDate: true,
                        client: { select: { name: true, rifOrId: true } }
                    }
                },
                payments: true
            }
        });

        res.status(201).json({
            message: appliedCredit > 0
                ? `Cuenta por cobrar creada. Se aplicaron ${formatCurrency(appliedCredit, recCurrency)} de saldo a favor.`
                : 'Cuenta por cobrar creada exitosamente',
            data: created
        });
    } catch (error) {
        console.error('Error in createReceivable:', error);
        res.status(500).json({ message: 'Error al crear cuenta por cobrar' });
    }
};

/**
 * @route   PUT /api/receivables/:id
 * @desc    Actualizar información general de una cuenta por cobrar
 */
export const updateReceivable = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.receivable.findFirst({ where: { id } });

        if (!existing) {
            return res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        }

        const { clientId, totalAmount, manualNotes, currency } = req.body;

        // Bloquear cambio de moneda si ya hay pagos registrados
        const paidAmount = Number(existing.paidAmount);
        if (currency && currency !== existing.currency && paidAmount > 0) {
            return res.status(400).json({ message: 'No se puede cambiar la moneda de una CxC con pagos registrados' });
        }
        const recCurrency = currency && VALID_CURRENCIES.includes(currency)
            ? currency
            : undefined;

        const nextClientId = clientId || existing.clientId;
        if (!nextClientId) {
            return res.status(400).json({ message: 'El cliente es requerido' });
        }

        const parsedAmount = totalAmount !== undefined ? Number(totalAmount) : Number(existing.totalAmount);
        if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });
        }

        if (parsedAmount < paidAmount) {
            return res.status(400).json({ message: 'El monto total no puede ser menor al monto ya pagado' });
        }

        const newBalance = parsedAmount - paidAmount;
        let newStatus = 'PENDING';
        if (newBalance <= 0) {
            newStatus = 'PAID';
        } else if (paidAmount > 0) {
            newStatus = 'PARTIALLY_PAID';
        }

        const updated = await prisma.receivable.update({
            where: { id },
            data: {
                clientId: nextClientId,
                totalAmount: parsedAmount,
                ...(recCurrency ? { currency: recCurrency } : {}),
                balance: newBalance,
                status: newStatus,
                manualNotes: manualNotes !== undefined ? (manualNotes || null) : existing.manualNotes
            },
            include: {
                client: { select: { name: true, rifOrId: true } },
                paymentNotice: {
                    select: {
                        number: true,
                        issueDate: true,
                        client: { select: { name: true, rifOrId: true } }
                    }
                },
                payments: { orderBy: { date: 'desc' } }
            }
        });

        res.json({
            message: 'Cuenta por cobrar actualizada correctamente',
            data: updated
        });
    } catch (error) {
        console.error('Error in updateReceivable:', error);
        res.status(500).json({ message: 'Error al actualizar cuenta por cobrar' });
    }
};

/**
 * @route   DELETE /api/receivables/:id
 * @desc    Eliminar cuenta por cobrar junto a sus pagos y recibos asociados
 */
export const deleteReceivable = async (req, res) => {
    try {
        const { id } = req.params;
        const receivable = await prisma.receivable.findFirst({ where: { id }, include: { payments: { include: { receipt: true } } } });
        if (!receivable) {
            return res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        }

        await prisma.receivable.update({ where: { id }, data: { deletedAt: new Date() } });

        res.json({ message: 'Cuenta por cobrar eliminada', data: { id: receivable.id } });
    } catch (error) {
        console.error('Error in deleteReceivable:', error);
        res.status(500).json({ message: 'Error al eliminar cuenta por cobrar' });
    }
};

export const deleteReceivablePayment = async (req, res) => {
    try {
        const { id, paymentId } = req.params;

        const receivable = await prisma.receivable.findFirst({ where: { id } });
        if (!receivable) {
            return res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        }

        const payment = await prisma.paymentTransaction.findFirst({
            where: { id: paymentId },
            include: { receipt: true }
        });

        if (!payment || payment.receivableId !== id) {
            return res.status(404).json({ message: 'Pago no encontrado para esta cuenta' });
        }

        const paymentAmount = Number(payment.amount);
        const overpaymentAmount = payment.overpaymentApplied ? Number(payment.overpaymentApplied) : 0;

        const result = await prisma.$transaction(async (tx) => {
            if (payment.receipt) {
                await tx.paymentReceipt.delete({ where: { id: payment.receipt.id } });
            }

            await tx.paymentTransaction.delete({ where: { id: payment.id } });

            // Revertir saldo a favor si el pago generó sobrepago
            if (overpaymentAmount > 0) {
                await tx.client.update({
                    where: { id: receivable.clientId },
                    data: {
                        creditBalance: { decrement: overpaymentAmount }
                    }
                });
            }

            const newPaidAmount = Math.max(0, Number(receivable.paidAmount) - paymentAmount);
            const totalAmount = Number(receivable.totalAmount);
            const newBalance = Math.max(0, totalAmount - newPaidAmount);
            let newStatus = 'PENDING';
            if (newBalance <= 0) {
                newStatus = 'PAID';
            } else if (newPaidAmount > 0) {
                newStatus = 'PARTIALLY_PAID';
            }

            const updatedReceivable = await tx.receivable.update({
                where: { id: receivable.id },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    status: newStatus
                },
                include: {
                    client: { select: { name: true, rifOrId: true } },
                    payments: { orderBy: { date: 'desc' } }
                }
            });

            return updatedReceivable;
        });

        res.json({
            message: 'Pago eliminado correctamente',
            data: result
        });
    } catch (error) {
        console.error('Error in deleteReceivablePayment:', error);
        res.status(500).json({ message: 'Error al eliminar el pago', error: error.message });
    }
};

/**
 * @route   GET /api/receivables
 * @desc    Obtener lista de cuentas por cobrar (Receivables)
 * @access  Private
 */
export const getReceivables = async (req, res) => {
    try {
        const { status, search = '', page = 1, limit = 10, clientId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;
        if (search) {
            const num = parseInt(search);
            const searchConditions = {
                OR: [
                    { client: { name: { contains: search, mode: 'insensitive' } } },
                    { paymentNotice: { client: { name: { contains: search, mode: 'insensitive' } } } },
                    ...(Number.isNaN(num) ? [] : [{ number: { equals: num } }])
                ]
            };

            Object.assign(where, searchConditions);
        }

        const [receivables, total] = await Promise.all([
            prisma.receivable.findMany({
                where: { ...where, deletedAt: null },
                include: {
                    client: { select: { name: true, rifOrId: true } },
                    paymentNotice: {
                        select: {
                            number: true,
                            issueDate: true,
                            client: { select: { name: true, rifOrId: true } }
                        }
                    },
                    payments: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.receivable.count({ where: { ...where, deletedAt: null } })
        ]);

        res.json({
            data: receivables,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getReceivables:', error);
        res.status(500).json({ message: 'Error al obtener cuentas por cobrar' });
    }
};

/**
 * @route   GET /api/receivables/:id
 * @desc    Obtener detalles de una cuenta por cobrar y sus pagos
 * @access  Private
 */
export const getReceivableById = async (req, res) => {
    try {
        const { id } = req.params;

        const receivable = await prisma.receivable.findFirst({
            where: { id },
            include: {
                client: { select: { name: true, email: true, rifOrId: true } },
                paymentNotice: {
                    select: {
                        number: true,
                        issueDate: true,
                        client: {
                            select: { name: true, email: true, rifOrId: true }
                        }
                    }
                },
                payments: {
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!receivable) {
            return res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        }

        res.json(receivable);
    } catch (error) {
        console.error('Error in getReceivableById:', error);
        res.status(500).json({ message: 'Error al obtener detalles de la cuenta' });
    }
};

/**
 * @route   POST /api/receivables/:id/payments
 * @desc    Registrar un abono/pago a una cuenta por cobrar
 * @access  Private
 */
export const registerPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference, date, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'El monto del pago debe ser mayor a 0' });
        }
        if (!method) {
            return res.status(400).json({ message: 'El método de pago es requerido' });
        }
        

        const receivable = await prisma.receivable.findFirst({
            where: { id },
            include: { client: true }
        });

        if (!receivable) {
            return res.status(404).json({ message: 'Cuenta por cobrar no encontrada' });
        }

        // Obtener nombre del usuario que registra el pago
        let issuedBy = req.user?.name;
        if (!issuedBy) {
            const user = await prisma.user.findUnique({
                where: { id: req.user?.id },
                select: { name: true }
            });
            issuedBy = user?.name || 'Sistema';
        }

        if (receivable.status === 'PAID') {
            return res.status(400).json({ message: 'Esta cuenta ya está pagada en su totalidad' });
        }

        const paymentAmount = Number(amount);
        const currentBalance = Number(receivable.balance);
        const totalAmount = Number(receivable.totalAmount);

        // Permite sobrepagos: el excedente se convierte en saldo a favor del cliente
        let newPaidAmount, newBalance, newStatus;
        let overpaymentAmount = 0;

        if (paymentAmount > currentBalance) {
            overpaymentAmount = paymentAmount - currentBalance;
            newPaidAmount = totalAmount;
            newBalance = 0;
            newStatus = 'PAID';
        } else {
            newPaidAmount = Number(receivable.paidAmount) + paymentAmount;
            newBalance = currentBalance - paymentAmount;
            newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
        }

        // Transacción para registrar el pago y actualizar la cuenta
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear la transacción de pago
            const payment = await tx.paymentTransaction.create({
                data: {
                    receivableId: receivable.id,
                    amount: paymentAmount,
                    overpaymentApplied: overpaymentAmount > 0 ? overpaymentAmount : null,
                    method,
                    reference,
                    notes: notes || null,
                    date: date ? new Date(date) : new Date()
                }
            });

            // 2. Crear recibo asociado (opcional pero recomendado en el schema actual)
            const receipt = await tx.paymentReceipt.create({
                data: {
                    paymentTransactionId: payment.id,
                    clientId: receivable.clientId,
                    amount: paymentAmount,
                    paymentMethod: method,
                    reference,
                    issuedBy
                }
            });

            // 3. Actualizar la cuenta por cobrar (Receivable)
            const updatedReceivable = await tx.receivable.update({
                where: { id: receivable.id },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    status: newStatus
                }
            });

            // 4. Si hay sobrepago, acumular saldo a favor del cliente
            if (overpaymentAmount > 0) {
                await tx.client.update({
                    where: { id: receivable.clientId },
                    data: {
                        creditBalance: { increment: overpaymentAmount }
                    }
                });
            }

            return { payment, receipt, updatedReceivable };
        });

        // Generar notificación si la CXC ha sido pagada en su totalidad
        if (newStatus === 'PAID') {
            let notificationMessage;
            if (overpaymentAmount > 0) {
                const clientData = await prisma.client.findFirst({
                    where: { id: receivable.clientId },
                    select: { creditBalance: true }
                });
                notificationMessage = `La cuenta CXC-${String(receivable.number).padStart(5, '0')} del cliente ${receivable.client.name} ha sido cobrada. Se generó un sobrepago de ${formatCurrency(overpaymentAmount, receivable.currency)} → Saldo a favor del cliente: ${formatCurrency(clientData.creditBalance, receivable.currency)}.`;
            } else {
                notificationMessage = `La cuenta CXC-${String(receivable.number).padStart(5, '0')} del cliente ${receivable.client.name} ha sido cobrada exitosamente (${formatCurrency(receivable.totalAmount, receivable.currency)}).`;
            }
            await createNotification({
                title: 'Cuenta por Cobrar Saldada',
                message: notificationMessage,
                type: 'SUCCESS',
                targetRoles: ['ADMIN'],
                entityType: 'RECEIVABLE',
                entityId: receivable.id
            });
        } else if (newStatus === 'PARTIALLY_PAID') {
            await createNotification({
                title: 'Abono en Cuenta por Cobrar',
                message: `Se ha registrado un abono de ${formatCurrency(paymentAmount, receivable.currency)} a la cuenta CXC-${String(receivable.number).padStart(5, '0')} del cliente ${receivable.client.name}. Saldo restante: ${formatCurrency(newBalance, receivable.currency)}.`,
                type: 'INFO',
                targetRoles: ['ADMIN'], // Sólo ADMIN
                entityType: 'RECEIVABLE',
                entityId: receivable.id
            });
        }

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error in registerPayment:', error);
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
};
