import prisma from '../config/database.js';
import { startOfMonth, endOfMonth } from 'date-fns';

/**
 * @route   GET /api/cash-flow
 * @desc    Obtener ingresos y egresos separados para la vista Balance
 * @access  Private (ADMIN)
 */
export const getCashFlow = async (req, res) => {
    try {
        const now = new Date();

        let startDate, endDate;
        if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate);
            endDate   = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            startDate = startOfMonth(now);
            endDate   = endOfMonth(now);
        }

        const dateFilter = { gte: startDate, lte: endDate };

        // ── Ingresos: PaymentTransaction (CXC) ──────────────────────────────
        const ingresos = await prisma.paymentTransaction.findMany({
            where: { date: dateFilter },
            include: {
                receivable: {
                    select: {
                        number: true,
                        client: { select: { name: true, rifOrId: true } },
                        paymentNotice: { select: { number: true } }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        // ── Egresos: PayableTransaction (CXP) ───────────────────────────────
        const egresos = await prisma.payableTransaction.findMany({
            where: { date: dateFilter },
            include: {
                payable: {
                    select: {
                        number: true,
                        description: true,
                        ally: { select: { name: true } },
                        svcProvider: { select: { name: true } },
                employeeUser: { select: { name: true, position: true } }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        // ── Resumen ─────────────────────────────────────────────────────────
        const totalIngresos = ingresos.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        const totalEgresos  = egresos.reduce((s, t)  => s + parseFloat(t.amount || 0), 0);

        res.json({
            summary: {
                totalIngresos,
                totalEgresos,
                balance: totalIngresos - totalEgresos
            },
            ingresos,
            egresos
        });

    } catch (error) {
        console.error('Error fetching cash flow:', error);
        res.status(500).json({ message: 'Error al obtener el balance' });
    }
};

