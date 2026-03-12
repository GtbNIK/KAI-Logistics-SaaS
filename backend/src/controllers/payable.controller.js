import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

/**
 * @route   GET /api/payables
 * @desc    Obtener lista de cuentas por pagar
 */
export const getPayables = async (req, res) => {
    try {
        const { status, search = '', page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;
        if (search) {
            const num = parseInt(search);
            where.OR = [
                { description: { contains: search, mode: 'insensitive' } },
                { ally: { name: { contains: search, mode: 'insensitive' } } },
                { svcProvider: { name: { contains: search, mode: 'insensitive' } } },
                ...(Number.isNaN(num) ? [] : [{ number: { equals: num } }])
            ];
        }

        const [payables, total] = await Promise.all([
            prisma.payable.findMany({
                where,
                include: {
                    ally: { select: { id: true, name: true } },
                    svcProvider: { select: { id: true, name: true } },
                    payments: { orderBy: { date: 'desc' } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.payable.count({ where })
        ]);

        res.json({
            data: payables,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error in getPayables:', error);
        res.status(500).json({ message: 'Error al obtener cuentas por pagar' });
    }
};

/**
 * @route   GET /api/payables/:id
 * @desc    Obtener detalle de una cuenta por pagar
 */
export const getPayableById = async (req, res) => {
    try {
        const { id } = req.params;
        const payable = await prisma.payable.findUnique({
            where: { id },
            include: {
                ally: { select: { id: true, name: true } },
                svcProvider: { select: { id: true, name: true } },
                payments: { orderBy: { date: 'desc' } }
            }
        });

        if (!payable) {
            return res.status(404).json({ message: 'Cuenta por pagar no encontrada' });
        }

        res.json(payable);
    } catch (error) {
        console.error('Error in getPayableById:', error);
        res.status(500).json({ message: 'Error al obtener detalle de la cuenta' });
    }
};

/**
 * @route   POST /api/payables
 * @desc    Crear nueva cuenta por pagar
 */
export const createPayable = async (req, res) => {
    try {
        const { allyId, svcProviderId, description, amount, dueDate, relatedOperationId } = req.body;

        if (!allyId && !svcProviderId) {
            return res.status(400).json({ message: 'Debe seleccionar un aliado o un proveedor de servicios' });
        }
        if (allyId && svcProviderId) {
            return res.status(400).json({ message: 'Solo puede seleccionar un aliado o un proveedor, no ambos' });
        }
        if (!description?.trim()) {
            return res.status(400).json({ message: 'La descripción es requerida' });
        }

        const parsedAmount = Number(amount);
        if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }

        const payable = await prisma.payable.create({
            data: {
                allyId: allyId || null,
                svcProviderId: svcProviderId || null,
                description: description.trim(),
                amount: parsedAmount,
                paidAmount: 0,
                balance: parsedAmount,
                status: 'PENDING',
                dueDate: dueDate ? new Date(dueDate) : null,
                relatedOperationId: relatedOperationId || null
            },
            include: {
                ally: { select: { id: true, name: true } },
                svcProvider: { select: { id: true, name: true } },
                payments: true
            }
        });

        res.status(201).json({
            message: 'Cuenta por pagar creada exitosamente',
            data: payable
        });
    } catch (error) {
        console.error('Error in createPayable:', error);
        res.status(500).json({ message: 'Error al crear cuenta por pagar' });
    }
};

/**
 * @route   POST /api/payables/:id/payments
 * @desc    Registrar un abono/pago a una cuenta por pagar
 */
export const registerPayablePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference, date, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'El monto del pago debe ser mayor a 0' });
        }
        if (!method) {
            return res.status(400).json({ message: 'El método de pago es requerido' });
        }

        const payable = await prisma.payable.findUnique({ where: { id } });

        if (!payable) {
            return res.status(404).json({ message: 'Cuenta por pagar no encontrada' });
        }

        if (payable.status === 'PAID') {
            return res.status(400).json({ message: 'Esta cuenta ya está pagada en su totalidad' });
        }

        const paymentAmount = Number(amount);
        const currentBalance = Number(payable.balance);

        if (paymentAmount > currentBalance) {
            return res.status(400).json({
                message: 'El pago excede el saldo pendiente',
                balance: currentBalance
            });
        }

        const newPaidAmount = Number(payable.paidAmount) + paymentAmount;
        const newBalance = currentBalance - paymentAmount;
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payableTransaction.create({
                data: {
                    payableId: payable.id,
                    amount: paymentAmount,
                    method,
                    reference: reference || null,
                    notes: notes || null,
                    date: date ? new Date(date) : new Date()
                }
            });

            const updatedPayable = await tx.payable.update({
                where: { id: payable.id },
                data: {
                    paidAmount: newPaidAmount,
                    balance: newBalance,
                    status: newStatus
                },
                include: {
                    ally: { select: { id: true, name: true } },
                    svcProvider: { select: { id: true, name: true } },
                    payments: { orderBy: { date: 'desc' } }
                }
            });

            return { payment, updatedPayable };
        });

        // Generar notificación si la CXP ha sido pagada en su totalidad
        if (newStatus === 'PAID') {
            const beneficiary = result.updatedPayable.ally?.name || result.updatedPayable.svcProvider?.name || 'Desconocido';
            await createNotification({
                title: 'Cuenta por Pagar Pagada',
                message: `La cuenta CXP-${String(payable.number).padStart(5, '0')} por $${parseFloat(payable.amount).toFixed(2)} a favor de ${beneficiary} ha sido pagada en su totalidad.`,
                type: 'SUCCESS',
                targetRoles: ['ADMIN'],
                entityType: 'PAYABLE',
                entityId: payable.id
            });
        }

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error in registerPayablePayment:', error);
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
};

/**
 * @route   DELETE /api/payables/:id
 * @desc    Eliminar cuenta por pagar
 */
export const deletePayable = async (req, res) => {
    try {
        const { id } = req.params;
        const payable = await prisma.payable.findUnique({ where: { id }, include: { payments: true } });

        if (!payable) {
            return res.status(404).json({ message: 'Cuenta por pagar no encontrada' });
        }
        if (payable.payments.length > 0) {
            return res.status(400).json({ message: 'No se puede eliminar una cuenta que tiene pagos registrados' });
        }

        await prisma.payable.delete({ where: { id } });
        res.json({ message: 'Cuenta por pagar eliminada' });
    } catch (error) {
        console.error('Error in deletePayable:', error);
        res.status(500).json({ message: 'Error al eliminar cuenta por pagar' });
    }
};
