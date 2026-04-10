import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

export const createReceivable = async (req, res) => {
    try {
        const { clientId, totalAmount, manualNotes } = req.body;

        if (!clientId) {
            return res.status(400).json({ message: 'El cliente es requerido' });
        }

        const amount = Number(totalAmount);
        if (!totalAmount || Number.isNaN(amount) || amount < 0) {
            return res.status(400).json({ message: 'El monto total debe ser mayor a 0' });
        }

        const receivable = await prisma.receivable.create({
            data: {
                paymentNoticeId: null,
                clientId,
                totalAmount: amount,
                paidAmount: 0,
                balance: amount,
                status: 'PENDING',
                manualNotes: manualNotes || null
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
                payments: true
            }
        });

        res.status(201).json({
            message: 'Cuenta por cobrar creada exitosamente',
            data: receivable
        });
    } catch (error) {
        console.error('Error in createReceivable:', error);
        res.status(500).json({ message: 'Error al crear cuenta por cobrar' });
    }
};

/**
 * @route   GET /api/receivables
 * @desc    Obtener lista de cuentas por cobrar (Receivables)
 * @access  Private
 */
export const getReceivables = async (req, res) => {
    try {
        const { status, search = '', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;
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
                where,
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
            prisma.receivable.count({ where })
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

        const receivable = await prisma.receivable.findUnique({
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
        

        const receivable = await prisma.receivable.findUnique({
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

        // Validar que el pago no exceda el saldo
        const paymentAmount = Number(amount);
        const currentBalance = Number(receivable.balance);
        
        if (paymentAmount > currentBalance) {
            return res.status(400).json({ 
                message: 'El pago excede el saldo pendiente',
                balance: currentBalance 
            });
        }

        const newPaidAmount = Number(receivable.paidAmount) + paymentAmount;
        const newBalance = currentBalance - paymentAmount;
        
        let newStatus = 'PARTIALLY_PAID';
        if (newBalance <= 0) {
            newStatus = 'PAID';
        }

        // Transacción para registrar el pago y actualizar la cuenta
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear la transacción de pago
            const payment = await tx.paymentTransaction.create({
                data: {
                    receivableId: receivable.id,
                    amount: paymentAmount,
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

            return { payment, receipt, updatedReceivable };
        });

        // Generar notificación si la CXC ha sido pagada en su totalidad
        if (newStatus === 'PAID') {
            await createNotification({
                title: 'Cuenta por Cobrar Saldada',
                message: `La cuenta CXC-${String(receivable.number).padStart(5, '0')} del cliente ${receivable.client.name} ha sido cobrada exitosamente ($${parseFloat(receivable.totalAmount).toFixed(2)}).`,
                type: 'SUCCESS',
                targetRoles: ['ADMIN', 'SALES'],
                entityType: 'RECEIVABLE',
                entityId: receivable.id
            });
        } else if (newStatus === 'PARTIALLY_PAID') {
            await createNotification({
                title: 'Abono en Cuenta por Cobrar',
                message: `Se ha registrado un abono de $${parseFloat(paymentAmount).toFixed(2)} a la cuenta CXC-${String(receivable.number).padStart(5, '0')} del cliente ${receivable.client.name}. Saldo restante: $${parseFloat(newBalance).toFixed(2)}.`,
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
