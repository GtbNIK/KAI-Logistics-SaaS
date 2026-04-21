import prisma from '../config/database.js';
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachMonthOfInterval, format, parseISO, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCashFlow } from './cash-flow.controller.js';

export const getDashboardSummary = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;

        const now = new Date();

        // --- Filtro de fecha global (query params) ---
        let startDate, endDate;

        if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate);
            endDate = new Date(req.query.endDate);
            // Asegurarse de que endDate sea al final del día
            endDate.setHours(23, 59, 59, 999);

            // Validación: startDate no puede ser después de endDate
            if (isAfter(startDate, endDate)) {
                return res.status(400).json({ message: 'La fecha inicial no puede ser posterior a la fecha final.' });
            }
        } else {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        const dateFilter = { gte: startDate, lte: endDate };

        // 1. Cotizaciones Aprobadas
        const quotesQuery = {
            where: {
                status: 'APPROVED',
                updatedAt: dateFilter
            }
        };
        // Si es SALES, solo ve sus propias cotizaciones
        if (userRole === 'SALES') {
            quotesQuery.where.userId = userId;
        }
        const approvedQuotesCount = await prisma.quote.count(quotesQuery);

        // 2 & 4. CXC y CXP - Sólo ADMIN
        let cxcPaidAmount = 0;
        let cxpPendingAmount = 0;

        if (userRole === 'ADMIN') {
            const rxTransactionsThisMonth = await prisma.paymentTransaction.findMany({
                where: { createdAt: dateFilter },
                select: { amount: true }
            });
            cxcPaidAmount = rxTransactionsThisMonth.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

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
            paymentNoticesQuery.where.client = { assignedUsers: { some: { id: userId } } };
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
            deliveryNotesQuery.where.client = { assignedUsers: { some: { id: userId } } };
        }
        const latestDeliveryNotes = await prisma.deliveryNote.findMany(deliveryNotesQuery);

        // Top 5 Clientes
        const topClientsAggregation = await prisma.quote.groupBy({
            by: ['clientId'],
            where: {
                status: 'APPROVED',
                createdAt: dateFilter,
                ...(userRole === 'SALES' ? { userId: userId } : {})
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
            return { ...clientInfo, totalQuotes: ag._count.id };
        });

        // --- CHART DATA ---
        // El chartRange es independiente: cuántos meses hacia atrás mostrar
        const chartRange = parseInt(req.query.chartRange) || 1;
        const chartStart = chartRange === 1 ? startDate : subMonths(now, chartRange);
        const chartEnd = chartRange === 1 ? endDate : now;

        const quotesChartQuery = {
            where: {
                createdAt: { gte: chartStart, lte: chartEnd },
                ...(userRole === 'SALES' ? { userId: userId } : {})
            },
            select: { createdAt: true }
        };
        const allQuotesForChart = await prisma.quote.findMany(quotesChartQuery);

        let chartData;

        if (chartRange <= 1) {
            // Agrupar por día
            const quotesByDate = allQuotesForChart.reduce((acc, quote) => {
                const dateStr = format(quote.createdAt, 'yyyy-MM-dd');
                acc[dateStr] = (acc[dateStr] || 0) + 1;
                return acc;
            }, {});

            const daysInRange = eachDayOfInterval({ start: chartStart, end: chartEnd });
            chartData = daysInRange.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return {
                    dateStr,
                    dayLabel: format(day, 'dd MMM', { locale: es }),
                    cotizaciones: quotesByDate[dateStr] || 0
                };
            });
        } else {
            // Agrupar por mes
            const quotesByMonth = allQuotesForChart.reduce((acc, quote) => {
                const monthStr = format(quote.createdAt, 'yyyy-MM');
                acc[monthStr] = (acc[monthStr] || 0) + 1;
                return acc;
            }, {});

            const monthsInRange = eachMonthOfInterval({ start: chartStart, end: chartEnd });
            chartData = monthsInRange.map(month => {
                const monthStr = format(month, 'yyyy-MM');
                return {
                    dateStr: monthStr,
                    dayLabel: format(month, 'MMM yyyy', { locale: es }),
                    cotizaciones: quotesByMonth[monthStr] || 0
                };
            });
        }

        // --- DONUT: Distribución de servicios en Avisos de Cobro ---
        const donutRange = parseInt(req.query.donutRange) || 1;
        const donutStart = subMonths(now, donutRange);
        const donutEnd = now;

        // Buscamos items directamente de los Avisos de Cobro creados en ese rango
        const serviceItems = await prisma.paymentNoticeItem.findMany({
            where: {
                paymentNotice: {
                    createdAt: { gte: donutStart, lte: donutEnd }
                }
            },
            include: {
                service: { select: { type: true, name: true } }
            }
        });

        // Agrupar por tipo de servicio, sumando totalPrice
        const serviceMap = serviceItems.reduce((acc, item) => {
            const key   = item.service?.type  || 'OTHER';
            const label = item.service?.name  || key;
            if (!acc[key]) acc[key] = { type: key, name: label, value: 0, count: 0 };
            acc[key].value += parseFloat(item.totalPrice || 0);
            acc[key].count += 1;
            return acc;
        }, {});

        const serviceDistribution = Object.values(serviceMap).sort((a, b) => b.value - a.value);

        res.json({
            dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
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
            chartData,
            serviceDistribution
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Error al obtener resumen del dashboard' });
    }
};

export const getMonthlyReportData = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'No autorizado para emitir reportes' });
        }

        const now = new Date();
        let startDate, endDate;

        if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate);
            endDate = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999);

            if (isAfter(startDate, endDate)) {
                return res.status(400).json({ message: 'La fecha inicial no puede ser posterior a la fecha final.' });
            }
        } else {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
        }

        const dateFilter = { gte: startDate, lte: endDate };

        // Calcular label legible del rango
        const rangeLabel = format(startDate, 'dd MMM yyyy', { locale: es }) + ' — ' + format(endDate, 'dd MMM yyyy', { locale: es });

        // Ingresos -> Transacciones de CXC
        const rxTransactions = await prisma.paymentTransaction.findMany({
            where: { createdAt: dateFilter },
            include: { receivable: { select: { number: true } } }
        });
        const totalIngresos = rxTransactions.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

        // Egresos -> Transacciones de CXP
        const pxTransactions = await prisma.payableTransaction.findMany({
            where: { date: dateFilter },
            include: { payable: { select: { number: true } } }
        });
        const totalEgresos = pxTransactions.reduce((acc, t) => acc + parseFloat(t.amount || 0), 0);

        const combinedTransactions = [
            ...rxTransactions.map(t => ({
                ...t,
                typeStr: 'INGRESO (CXC)',
                recordDate: t.createdAt || t.date,
                accountNumber: t.receivable?.number ? `CXC-${t.receivable.number}` : 'N/A'
            })),
            ...pxTransactions.map(t => ({
                ...t,
                typeStr: 'EGRESO (CXP)',
                recordDate: t.date,
                accountNumber: t.payable?.number ? `CXP-${t.payable.number}` : 'N/A'
            }))
        ].sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));

        // Para el formato frontal de cierre
        const mappedTransactions = combinedTransactions.map(t => ({
            ...t,
            createdAt: t.recordDate
        }));

        res.json({
            rangeLabel,
            totalIngresos,
            totalEgresos,
            balanceNeto: totalIngresos - totalEgresos,
            transactions: mappedTransactions
        });

    } catch (error) {
        console.error('Error fetching monthly report:', error);
        res.status(500).json({ message: 'Error al generar reporte mensual' });
    }
};

// Reexportar getCashFlow desde el controller específico para mantener compatibilidad
export { getCashFlow };
