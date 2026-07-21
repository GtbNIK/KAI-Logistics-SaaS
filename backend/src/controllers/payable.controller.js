import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

/**
 * @route   GET /api/payables
 * @desc    Obtener lista de cuentas por pagar
 */
export const getPayables = async (req, res) => {
    try {
        const { status, search = '', page = 1, limit = 10, beneficiaryId, employeeOnly, all } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;
        if (employeeOnly === 'true') {
            where.employeeUserId = { not: null };
        }
        if (beneficiaryId) {
            where.OR = [
                { allyId: beneficiaryId },
                { svcProviderId: beneficiaryId },
                { employeeUserId: beneficiaryId }
            ];
        }
        if (search) {
            const num = parseInt(search);
            const searchConditions = {
OR: [
                    { description: { contains: search, mode: 'insensitive' } },
                    { ally: { name: { contains: search, mode: 'insensitive' } } },
                    { svcProvider: { name: { contains: search, mode: 'insensitive' } } },
                    { employeeUser: { name: { contains: search, mode: 'insensitive' } } },
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
                where: { ...where, deletedAt: null },
                include: {
                    ...(employeeOnly === 'true' ? {} : {
                        ally: { select: { id: true, name: true } },
                        svcProvider: { select: { id: true, name: true } },
                    }),
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
                    payments: { orderBy: { date: 'desc' } }
                },
                orderBy: { createdAt: 'desc' },
                ...(all === 'true' ? {} : { skip, take: parseInt(limit) })
            }),
            prisma.payable.count({ where: { ...where, deletedAt: null } })
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
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
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
        const { allyId, svcProviderId, employeeUserId, description, amount, dueDate, relatedOperationId, invoiceNr, currency } = req.body;
        const recCurrency = currency && ['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CNY'].includes(currency) ? currency : 'USD';

        if (!allyId && !svcProviderId && !employeeUserId) {
            return res.status(400).json({ message: 'Debe seleccionar un aliado, proveedor o empleado' });
        }
        if ((allyId ? 1 : 0) + (svcProviderId ? 1 : 0) + (employeeUserId ? 1 : 0) !== 1) {
            return res.status(400).json({ message: 'Solo puede seleccionar un tipo de beneficiario, no varios' });
        }
        if (!description?.trim()) {
            return res.status(400).json({ message: 'La descripción es requerida' });
        }

        const parsedAmount = Number(amount);
        if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }

        // Generar numero secuencial por tenant
        const lastPayable = await prisma.payable.findFirst({
            where: { tenantId: req.tenant.id },
            orderBy: { number: 'desc' },
            select: { number: true },
        });
        const nextNumber = (lastPayable?.number || 0) + 1;

        const payable = await prisma.payable.create({
            data: {
                number: nextNumber,
                allyId: allyId || null,
                svcProviderId: svcProviderId || null,
                employeeUserId: employeeUserId || null,
                description: description.trim(),
                currency: recCurrency,
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
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
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
            employeeUserId,
            description,
            amount,
            dueDate,
            relatedOperationId,
            invoiceNr,
            currency
        } = req.body;

        const nextAllyId = allyId !== undefined ? allyId : existing.allyId;
        const nextProviderId = svcProviderId !== undefined ? svcProviderId : existing.svcProviderId;
        const nextEmployeeId = employeeUserId !== undefined ? employeeUserId : existing.employeeUserId;

        if (!nextAllyId && !nextProviderId && !nextEmployeeId) {
            return res.status(400).json({ message: 'Debe seleccionar un aliado, proveedor o empleado' });
        }
        if ((nextAllyId ? 1 : 0) + (nextProviderId ? 1 : 0) + (nextEmployeeId ? 1 : 0) !== 1) {
            return res.status(400).json({ message: 'Solo puede seleccionar un tipo de beneficiario, no varios' });
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

        const recCurrency = currency !== undefined
            ? (['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CNY'].includes(currency) ? currency : 'USD')
            : existing.currency;

        const updated = await prisma.payable.update({
            where: { id },
            data: {
                allyId: nextAllyId || null,
                svcProviderId: nextProviderId || null,
                employeeUserId: nextEmployeeId || null,
                description: newDescription,
                currency: recCurrency,
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
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
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
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
                    payments: { orderBy: { date: 'desc' } }
                }
            });

            return { payment, updatedPayable };
        });

        // Generar notificación si la CXP ha sido pagada en su totalidad
        if (newStatus === 'PAID') {
            const beneficiary = result.updatedPayable.ally?.name || result.updatedPayable.svcProvider?.name || result.updatedPayable.employeeUser?.name || 'Desconocido';
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
        await prisma.payable.update({ where: { id }, data: { deletedAt: new Date() } });
        res.json({ message: 'Cuenta por pagar eliminada (soft delete)', data: { id: payable.id, invoiceNr: payable.invoiceNr } });
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
                    employeeUser: { select: { id: true, name: true, position: true, memberships: { where: { tenantId: req.tenant.id }, select: { role: true }, take: 1 } } },
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






