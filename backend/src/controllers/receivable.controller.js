import prisma from '../config/database.js';

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
            where.paymentNotice = {
                client: { name: { contains: search, mode: 'insensitive' } }
            };
        }

        const [receivables, total] = await Promise.all([
            prisma.receivable.findMany({
                where,
                include: {
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
                    issuedBy: req.user.name // require auth middleware
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

        res.status(201).json({
            message: 'Pago registrado exitosamente',
            data: result
        });

    } catch (error) {
        console.error('Error in registerPayment:', error);
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
};
