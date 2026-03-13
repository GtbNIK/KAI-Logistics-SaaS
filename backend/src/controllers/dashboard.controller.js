import prisma from '../config/database.js';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const getDashboardSummary = async (req, res) => {
    try {
        const userRole = req.user.role; // 'ADMIN' o 'SALES'
        const userId = req.user.id;

        const now = new Date();
        const startCurrentMonth = startOfMonth(now);
        const endCurrentMonth = endOfMonth(now);

        const dateFilter = {
            gte: startCurrentMonth,
            lte: endCurrentMonth
        };

        // 1. Cotizaciones Aprobadas
        const quotesQuery = {
            where: {
                status: 'APPROVED',
                updatedAt: dateFilter
            }
        };
        // Si es SALES, solo ve sus propias cotizaciones
        if (userRole === 'SALES') {
            quotesQuery.where.vendedorId = userId;
        }
        const approvedQuotesCount = await prisma.quote.count(quotesQuery);

        // 2 & 4. Cuentas por Cobrar (CXC) y Cuentas por Pagar (CXP) - Sólo ADMIN
        let cxcPaidAmount = 0;
        let cxpPendingAmount = 0;

        if (userRole === 'ADMIN') {
            // Dinero recaudado este mes (Transacciones pagadas)
            const rxTransactionsThisMonth = await prisma.paymentTransaction.findMany({
                where: {
                    createdAt: dateFilter
                },
                select: { amount: true }
            });
            cxcPaidAmount = rxTransactionsThisMonth.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

            // CXP Pendientes (Todo lo que no se haya pagado, creado este mes)
            const pendingPayables = await prisma.payable.findMany({
                where: {
                    status: { not: 'PAID' },
                    createdAt: dateFilter
                },
                select: { balance: true }
            });
            cxpPendingAmount = pendingPayables.reduce((acc, curr) => acc + parseFloat(curr.balance || 0), 0);
        }

        // 3. Embarques Pendientes (No Entregados)
        const shipmentsQuery = {
            where: {
                status: { not: 'DELIVERED' },
                createdAt: dateFilter
            }
        };
        if (userRole === 'SALES') {
            shipmentsQuery.where.vendedorId = userId;
        }
        const pendingShipmentsCount = await prisma.shipment.count(shipmentsQuery);

        // --- PREVIEWS (Listas cortas) ---

        // Últimos Avisos de Cobro
        const paymentNoticesQuery = {
            where: { createdAt: dateFilter },
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        };
        if (userRole === 'SALES') {
            paymentNoticesQuery.where.vendedorId = userId;
        }
        const latestPaymentNotices = await prisma.paymentNotice.findMany(paymentNoticesQuery);

        // Últimas Notas de Entrega
        const deliveryNotesQuery = {
            where: { createdAt: dateFilter },
            include: { client: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        };
        if (userRole === 'SALES') {
            deliveryNotesQuery.where.vendedorId = userId;
        }
        const latestDeliveryNotes = await prisma.deliveryNote.findMany(deliveryNotesQuery);

        // Top 5 Clientes (Con más cotizaciones aprobadas del mes)
        // Para ordenar por los que más cotizan
        const topClientsAggregation = await prisma.quote.groupBy({
            by: ['clientId'],
            where: {
                status: 'APPROVED',
                createdAt: dateFilter,
                ...(userRole === 'SALES' ? { vendedorId: userId } : {})
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });

        // Poblar datos de los clientes obtenidos
        const clientIds = topClientsAggregation.map(c => c.clientId);
        const clientsData = await prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true, internalCode: true }
        });

        const topClients = topClientsAggregation.map(ag => {
            const clientInfo = clientsData.find(c => c.id === ag.clientId);
            return {
                ...clientInfo,
                totalQuotes: ag._count.id
            };
        });

        // --- CHART DATA: Cotizaciones creadas por día ---
        const quotesChartQuery = {
            where: {
                createdAt: dateFilter,
                ...(userRole === 'SALES' ? { vendedorId: userId } : {})
            },
            select: { createdAt: true }
        };
        const allQuotesThisMonth = await prisma.quote.findMany(quotesChartQuery);

        // Agrupar por fecha string YYYY-MM-DD
        const quotesByDate = allQuotesThisMonth.reduce((acc, quote) => {
            const dateStr = format(quote.createdAt, 'yyyy-MM-dd');
            acc[dateStr] = (acc[dateStr] || 0) + 1;
            return acc;
        }, {});

        // Rellenar los días del mes actual para que la gráfica no tenga huecos
        const daysInMonth = eachDayOfInterval({ start: startCurrentMonth, end: endCurrentMonth });
        
        const chartData = daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return {
                dateStr,
                dayLabel: format(day, 'dd MMM', { locale: es }),
                cotizaciones: quotesByDate[dateStr] || 0
            };
        });

        res.json({
            metrics: {
                approvedQuotesCount,
                cxcPaidAmount,
                pendingShipmentsCount,
                cxpPendingAmount
            },
            previews: {
                latestPaymentNotices,
                latestDeliveryNotes,
                topClients
            },
            chartData
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Error al obtener resumen del dashboard' });
    }
};

export const getMonthlyReportData = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'No autorizado para emitir cierres' });
        }

        const now = new Date();
        const startCurrentMonth = startOfMonth(now);
        const endCurrentMonth = endOfMonth(now);
        const dateFilter = { gte: startCurrentMonth, lte: endCurrentMonth };

        // 1. Ingresos y Egresos Globales del mes
        // Ingresos -> Transacciones de CXC
        const rxTransactions = await prisma.paymentTransaction.findMany({
            where: { createdAt: dateFilter }
        });
        const totalIngresos = rxTransactions.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

        // Egresos -> Transacciones de CXP
        const pxTransactions = await prisma.payableTransaction.findMany({
            where: { createdAt: dateFilter }
        });
        const totalEgresos = pxTransactions.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

        // 2. Transacciones relevantes
        // Todas las transacciones combinadas y ordenadas
        const combinedTransactions = [
            ...rxTransactions.map(t => ({ ...t, typeStr: 'INGRESO (CXC)' })),
            ...pxTransactions.map(t => ({ ...t, typeStr: 'EGRESO (CXP)' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            monthName: format(now, 'MMMM yyyy', { locale: es }),
            totalIngresos,
            totalEgresos,
            balanceNeto: totalIngresos - totalEgresos,
            transactions: combinedTransactions
        });
        
    } catch (error) {
        console.error('Error fetching monthly report:', error);
        res.status(500).json({ message: 'Error al generar reporte mensual' });
    }
};
