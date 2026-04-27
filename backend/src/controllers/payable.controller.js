import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

/**
 * @route   GET /api/payables
 * @desc    Obtener lista de cuentas por pagar
 */
export const getPayables = async (req, res) => {
    try {
        const { status, search = '', page = 1, limit = 10, beneficiaryId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;
        if (beneficiaryId) {
            where.OR = [
                { allyId: beneficiaryId },
                { svcProviderId: beneficiaryId }
            ];
        }
        if (search) {
            const num = parseInt(search);
            const searchConditions = {
                OR: [
                    { description: { contains: search, mode: 'insensitive' } },
                    { ally: { name: { contains: search, mode: 'insensitive' } } },
                    { svcProvider: { name: { contains: search, mode: 'insensitive' } } },
                    { invoiceNr: { contains: search, mode: 'insensitive' } },
                    ...(Number.isNaN(num) ? [] : [{ number: { equals: num } }])
                ]
            };
            
            if (beneficiaryId) {
                // Si hay beneficiario y búsqueda, combinar ambas condiciones
                where.OR = [
                    ...where.OR,
                    ...searchConditions.OR
                ];
            } else {
                Object.assign(where, searchConditions);
            }
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
        const { allyId, svcProviderId, description, amount, dueDate, relatedOperationId, invoiceNr } = req.body;

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
                relatedOperationId: relatedOperationId || null,
                invoiceNr: invoiceNr?.toString().trim() || null
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
 * @route   PUT /api/payables/:id
 * @desc    Actualizar información general de una cuenta por pagar
 */
export const updatePayable = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.payable.findUnique({ where: { id } });

        if (!existing) {
            return res.status(404).json({ message: 'Cuenta por pagar no encontrada' });
        }

        const {
            allyId,
            svcProviderId,
            description,
            amount,
            dueDate,
            relatedOperationId,
            invoiceNr
        } = req.body;

        const nextAllyId = allyId !== undefined ? allyId : existing.allyId;
        const nextProviderId = svcProviderId !== undefined ? svcProviderId : existing.svcProviderId;

        if (!nextAllyId && !nextProviderId) {
            return res.status(400).json({ message: 'Debe seleccionar un aliado o un proveedor de servicios' });
        }
        if (nextAllyId && nextProviderId) {
            return res.status(400).json({ message: 'Solo puede seleccionar un aliado o un proveedor, no ambos' });
        }

        const newDescription = description !== undefined ? description.trim() : existing.description;
        if (!newDescription) {
            return res.status(400).json({ message: 'La descripción es requerida' });
        }

        const parsedAmount = amount !== undefined ? Number(amount) : Number(existing.amount);
        if (!parsedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }

        const paidAmount = Number(existing.paidAmount);
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

        const updated = await prisma.payable.update({
            where: { id },
            data: {
                allyId: nextAllyId || null,
                svcProviderId: nextProviderId || null,
                description: newDescription,
                amount: parsedAmount,
                balance: newBalance,
                status: newStatus,
                dueDate: dueDate === undefined ? existing.dueDate : (dueDate ? new Date(dueDate) : null),
                relatedOperationId: relatedOperationId !== undefined ? relatedOperationId : existing.relatedOperationId,
                invoiceNr: invoiceNr !== undefined ? (invoiceNr?.toString().trim() || null) : existing.invoiceNr
            },
            include: {
                ally: { select: { id: true, name: true } },
                svcProvider: { select: { id: true, name: true } },
                payments: { orderBy: { date: 'desc' } }
            }
        });

        res.json({
            message: 'Cuenta por pagar actualizada correctamente',
            data: updated
        });
    } catch (error) {
        console.error('Error in updatePayable:', error);
        res.status(500).json({ message: 'Error al actualizar cuenta por pagar' });
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
        // Eliminar pagos asociados y luego la cuenta (cascade manual)
        await prisma.$transaction(async (tx) => {
            if (payable.payments.length > 0) {
                await tx.payableTransaction.deleteMany({ where: { payableId: id } });
            }
            await tx.payable.delete({ where: { id } });
        });
        res.json({
            message: 'Cuenta por pagar eliminada',
            data: { id: payable.id, invoiceNr: payable.invoiceNr }
        });
    } catch (error) {
        console.error('Error in deletePayable:', error);
        res.status(500).json({ message: 'Error al eliminar cuenta por pagar' });
    }
};

/**
 * @route   DELETE /api/payables/:id/payments/:paymentId
 * @desc    Eliminar un abono especifico de una cuenta por pagar
 */
export const deletePayablePayment = async (req, res) => {
    try {
        const { id, paymentId } = req.params;

        const payable = await prisma.payable.findUnique({ where: { id } });
        if (!payable) {
            return res.status(404).json({ message: 'Cuenta por pagar no encontrada' });
        }

        const payment = await prisma.payableTransaction.findUnique({
            where: { id: paymentId }
        });

        if (!payment || payment.payableId !== id) {
            return res.status(404).json({ message: 'Abono no encontrado para esta cuenta' });
        }

        const paymentAmount = Number(payment.amount);
        const result = await prisma.$transaction(async (tx) => {
            await tx.payableTransaction.delete({ where: { id: payment.id } });

            const newPaidAmount = Math.max(0, Number(payable.paidAmount) - paymentAmount);
            const totalAmount = Number(payable.amount);
            const newBalance = Math.max(0, totalAmount - newPaidAmount);
            let newStatus = 'PENDING';
            if (newBalance <= 0) {
                newStatus = 'PAID';
            } else if (newPaidAmount > 0) {
                newStatus = 'PARTIALLY_PAID';
            }

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

            return updatedPayable;
        });

        res.json({
            message: 'Abono eliminado correctamente',
            data: result
        });
    } catch (error) {
        console.error('Error in deletePayablePayment:', error);
        res.status(500).json({ message: 'Error al eliminar el abono', error: error.message });
    }
};
