import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../services/dashboard.service';
import { notificationService } from '../services/notification.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
    TrendingUp, FileText, Ship, CreditCard, ArrowRight,
    Users, Loader2, CalendarDays, X, Bell, ChevronRight, Sparkles
} from 'lucide-react';
import ClosureReportButton from '../components/dashboard/ClosureReportButton';
import { generateClosurePdf } from '../components/dashboard/closurePdfGenerator';
import { isFirstDayOfMonth, isLastDayOfMonth, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useToast } from '../context/ToastContext';
import InformationModal from '../components/modals/InformationModal';
import useInformationModal from '../hooks/useInformationModal';

const DashboardInfoCard = ({ title, value, icon: Icon, colorClass, subtitle, delayClass = "" }) => (
    <div className={`bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group ${delayClass} animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-backwards duration-700`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</p>
                <h3 className="text-[2.5rem] leading-none font-extrabold text-slate-800 mt-4 tracking-tight group-hover:scale-[1.02] origin-left transition-transform duration-300">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-3 font-medium">{subtitle}</p>}
            </div>
            <div className={`p-3.5 rounded-xl ${colorClass.split(' ')[0]} bg-opacity-10 ring-1 ring-inset ring-black/5`}>
                <Icon className={`w-6 h-6 ${colorClass.split(' ')[1]}`} strokeWidth={2.5} />
            </div>
        </div>
    </div>
);

const PreviewTable = ({ title, icon: Icon, items, onNavigate, renderRow, emptyMessage, primaryColor, delayClass = "" }) => (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden flex flex-col h-full ${delayClass} animate-in fade-in-0 slide-in-from-bottom-6 fill-mode-backwards duration-700`}>
        <div className="px-6 py-5 border-b border-slate-100/60 bg-transparent flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 tracking-wide">
                <div className="p-2 bg-slate-50 rounded-xl">
                    <Icon className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                </div>
                {title}
            </h3>
        </div>
        <div className="flex-1 overflow-auto">
            {items && items.length > 0 ? (
                <div className="divide-y divide-slate-50/80">{items.map(renderRow)}</div>
            ) : (
                <div className="p-10 text-center text-slate-400 text-sm font-medium">
                    {emptyMessage || "No hay datos para mostrar."}
                </div>
            )}
        </div>
        <button 
            onClick={onNavigate}
            style={{ backgroundColor: primaryColor || '#0ea5e9' }}
            className="m-3 p-3.5 rounded-xl text-sm font-bold text-white hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-auto shadow-sm shadow-black/5"
        >
            Ver módulo completo <ArrowRight className="w-4 h-4" />
        </button>
    </div>
);

const CHART_RANGE_OPTIONS = [
    { value: 1, label: 'Último mes' },
    { value: 3, label: '3 meses' },
    { value: 6, label: '6 meses' },
    { value: 12, label: '12 meses' },
];

const notifTypeDot = {
    SUCCESS: 'bg-emerald-500',
    WARNING:  'bg-amber-500',
    ALARM:    'bg-red-500',
    INFO:     'bg-blue-500',
};

// ─── Helpers para el selector de fechas ─────────────────────────────────────
const MONTHS_LABELS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const YEAR_OPTIONS   = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
const buildDateStr   = (day, month, year) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// Sub-selector compacto para el modal
const CompactDateSelector = ({ label, day, month, year, onDay, onMonth, onYear }) => {
    const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1);
    return (
        <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
            <div className="flex gap-1.5">
                <select
                    value={day}
                    onChange={e => onDay(Number(e.target.value))}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                >
                    {days.map(d => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
                </select>
                <select
                    value={month}
                    onChange={e => {
                        const m = Number(e.target.value);
                        onMonth(m);
                        const max = getDaysInMonth(m, year);
                        if (day > max) onDay(max);
                    }}
                    className="flex-[2] border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                >
                    {MONTHS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select
                    value={year}
                    onChange={e => {
                        const y = Number(e.target.value);
                        onYear(y);
                        const max = getDaysInMonth(month, y);
                        if (day > max) onDay(max);
                    }}
                    className="flex-[1.5] border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                >
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
    );
};

// Modal de selección de rango de fechas
const DateRangeModal = ({ onClose, onApply, primaryColor }) => {
    const now = new Date();

    const [fromDay,   setFromDay]   = useState(1);
    const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
    const [fromYear,  setFromYear]  = useState(now.getFullYear());

    const [toDay,   setToDay]   = useState(now.getDate());
    const [toMonth, setToMonth] = useState(now.getMonth() + 1);
    const [toYear,  setToYear]  = useState(now.getFullYear());

    const fromStr = buildDateStr(fromDay, fromMonth, fromYear);
    const toStr   = buildDateStr(toDay,   toMonth,   toYear);
    const isInvalid = new Date(fromStr) > new Date(toStr);

    const handleApply = () => {
        if (isInvalid) return;
        onApply(fromStr, toStr);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-slate-400" />
                        Elegir rango de fechas
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-4">
                    <CompactDateSelector
                        label="Desde"
                        day={fromDay}   month={fromMonth}   year={fromYear}
                        onDay={setFromDay} onMonth={setFromMonth} onYear={setFromYear}
                    />
                    <CompactDateSelector
                        label="Hasta"
                        day={toDay}   month={toMonth}   year={toYear}
                        onDay={setToDay} onMonth={setToMonth} onYear={setToYear}
                    />
                    {isInvalid && (
                        <p className="text-xs text-red-500">La fecha inicial no puede ser posterior a la fecha final.</p>
                    )}
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
                        Cerrar
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isInvalid}
                        style={{ backgroundColor: primaryColor }}
                        className="flex-1 px-4 py-2 text-sm text-white rounded-lg hover:brightness-110 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();
    const chartRef = useRef(null);
    const donutChartRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [showReminder, setShowReminder] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);

    // Hook para el modal de información (se muestra las primeras 2 veces)
    const { isOpen: showInfoModal, closeModal: closeInfoModal } = useInformationModal('dashboard-welcome-v3', 2);

    // Filtro: true = "último mes" (default), false = rango custom
    const [useCustomRange, setUseCustomRange] = useState(false);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate,   setEndDate]   = useState(format(endOfMonth(new Date()),   'yyyy-MM-dd'));
    const [chartRange, setChartRange] = useState(1);
    const [donutRange, setDonutRange] = useState(1);

    const [data, setData] = useState({
        metrics: { approvedQuotesCount: 0, cxcPaidAmount: 0, pendingShipmentsCount: 0, cxpPendingAmount: 0 },
        previews: { latestPaymentNotices: [], latestDeliveryNotes: [], topClients: [] },
        chartData: [],
        serviceDistribution: []
    });

    // Notificaciones (solo admin)
    const [notifications, setNotifications] = useState([]);

    const primaryColor   = settings?.primaryColor  || '#0ea5e9';
    const secondaryColor = settings?.secondaryColor || '#f97316';

    const fetchSummary = async (sDate, eDate, cRange, dRange) => {
        setLoading(true);
        try {
            const summary = await dashboardService.getSummary({
                startDate: sDate,
                endDate: eDate,
                chartRange: cRange,
                donutRange: dRange ?? donutRange
            });
            setData(summary);
        } catch (err) {
            console.error("Error al cargar el dashboard:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await notificationService.getUnread();
            if (res?.data) setNotifications(res.data.slice(0, 4));
        } catch (err) {
            console.error('Error cargando notificaciones:', err);
        }
    };

    useEffect(() => {
        fetchSummary(startDate, endDate, chartRange);
        if (user?.role === 'ADMIN') {
            fetchNotifications();
            const now = new Date();
            if (isFirstDayOfMonth(now) || isLastDayOfMonth(now)) {
                if (!sessionStorage.getItem('monthClosureReminded')) {
                    setShowReminder(true);
                }
            }
        }
    }, [user?.role]);

    // Cuando el usuario cambia el switch al "último mes"
    const handleSwitchToCurrentMonth = () => {
        const sDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const eDate = format(endOfMonth(new Date()),   'yyyy-MM-dd');
        setUseCustomRange(false);
        setStartDate(sDate);
        setEndDate(eDate);
        fetchSummary(sDate, eDate, chartRange);
    };

    // El modal de fechas aplica el rango
    const handleApplyCustomRange = (from, to) => {
        setUseCustomRange(true);
        setStartDate(from);
        setEndDate(to);
        fetchSummary(from, to, chartRange);
    };

    const handleChartRangeChange = (newRange) => {
        setChartRange(newRange);
        fetchSummary(startDate, endDate, newRange, donutRange);
    };

    const handleDonutRangeChange = (newRange) => {
        setDonutRange(newRange);
        fetchSummary(startDate, endDate, chartRange, newRange);
    };

    const handleGenerateReminder = async () => {
        await generateClosurePdf(settings, showSuccess, showError, setGeneratingReport, { startDate, endDate }, chartRef, donutChartRef, metrics);
        closeReminder();
    };

    const closeReminder = () => {
        sessionStorage.setItem('monthClosureReminded', 'true');
        setShowReminder(false);
    };

    const navigateFromNotif = (notif) => {
        if (notif.entityType === 'QUOTE')       navigate(`/dashboard/cotizaciones?id=${notif.entityId}`);
        else if (notif.entityType === 'CLIENT')     navigate(`/dashboard/clientes?id=${notif.entityId}`);
        else if (notif.entityType === 'RECEIVABLE') navigate(`/dashboard/cx-cobrar?id=${notif.entityId}`);
        else if (notif.entityType === 'PAYABLE')    navigate(`/dashboard/cx-pagar?id=${notif.entityId}`);
        else if (notif.entityType === 'ALLY')       navigate(`/dashboard/aliados?id=${notif.entityId}`);
        else if (notif.entityType === 'SHIPMENT')   navigate(`/dashboard/embarques?id=${notif.entityId}`);
    };

    const { metrics, previews, chartData, serviceDistribution } = data;

    // Paleta de colores para el donut - curada y armoniosa
    const DONUT_COLORS = [
        '#6366f1', '#f97316', '#10b981', '#f59e0b',
        '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6'
    ];

    const SERVICE_LABELS = {
        DOOR_TO_DOOR: 'Door to Door',
        FCL_20: 'FCL 20\'',
        FCL_40: 'FCL 40\'',
        FCL_40HC: 'FCL 40HC',
        LCL: 'LCL',
        AIR: 'Aéreo',
        WAREHOUSE: 'Almacenaje',
        CUSTOMS: 'Agenciamiento Aduanal',
        OTHER: 'Otro'
    };

    const totalServiceValue = serviceDistribution.reduce((s, d) => s + d.value, 0);

    const formatMoney = (amount) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const formatDate = (dateString) =>
        new Date(dateString).toLocaleDateString('es-VE', { month: 'short', day: 'numeric' });

    const rangeLabel = useCustomRange
        ? `${startDate} — ${endDate}`
        : 'Último mes';

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-5">
            
            {/* Modal Recordatorio Cierre */}
            {showReminder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4 text-amber-500">
                            <span className="p-2 bg-amber-50 rounded-lg"><FileText className="w-6 h-6" /></span>
                            <h2 className="text-xl font-bold text-slate-800">¡Cierre Mensual!</h2>
                        </div>
                        <p className="text-slate-600 mb-6 text-sm">
                            El momento del balance ha llegado. ¿Recordaste generar y descargar tu reporte contable del mes? Si así lo deseas, recopilaré y evaluaré todas tus estadísticas de inmediato.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={closeReminder} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
                                Sí, ya lo hice / Omitir
                            </button>
                            <button 
                                onClick={handleGenerateReminder}
                                disabled={generatingReport}
                                style={{ backgroundColor: primaryColor }}
                                className="flex items-center justify-center min-w-[130px] gap-2 px-4 py-2 text-sm text-white rounded-lg hover:brightness-110 transition-colors disabled:opacity-70 font-medium"
                            >
                                {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generar ahora"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal selector de rango de fechas */}
            {showDateModal && (
                <DateRangeModal 
                    primaryColor={primaryColor}
                    onClose={() => setShowDateModal(false)}
                    onApply={handleApplyCustomRange}
                />
            )}
            
            {/* ── Cabecera ────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-in fade-in-0 slide-in-from-top-4 fill-mode-backwards duration-700">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Resumen Operativo</h1>
                    <p className="text-slate-500 text-sm mt-1.5 font-medium">
                        Métricas y rendimiento · <span className="font-bold text-slate-700">{rangeLabel}</span>
                    </p>
                </div>

                {/* Controles derecha */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Switch Último mes / Rango custom */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-sm">
                        <button
                            onClick={handleSwitchToCurrentMonth}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                                !useCustomRange ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Último mes
                        </button>
                        <button
                            onClick={() => setShowDateModal(true)}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                                useCustomRange ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            Elegir rango
                            {useCustomRange && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />}
                        </button>
                    </div>

                    {user?.role === 'ADMIN' && (
                        <ClosureReportButton dateRange={{ startDate, endDate }} chartRef={chartRef} donutChartRef={donutChartRef} metrics={metrics} />
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center items-center min-h-[180px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
                </div>
            )}

            {!loading && (
                <>
                    {/* ── Fila 1: KPIs y Actividad Reciente ── */}
                    <div className={`grid gap-6 items-stretch ${user?.role === 'ADMIN' ? 'xl:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
                        {/* Columna Izquierda: KPIs */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${user?.role === 'ADMIN' ? '2' : '3'} 2xl:grid-cols-${user?.role === 'ADMIN' ? '4' : '3'} gap-6`}>
                            <DashboardInfoCard 
                                delayClass="[animation-delay:100ms]"
                                title={user?.role === 'ADMIN' ? "Cotizaciones Aprobadas" : "Tus Cotizaciones Aprobadas"} 
                                value={metrics.approvedQuotesCount} 
                                icon={FileText} colorClass="bg-blue-500 text-blue-500"
                                subtitle="En rango seleccionado"
                            />
                            {user?.role === 'ADMIN' && (
                                <DashboardInfoCard 
                                    delayClass="[animation-delay:200ms]"
                                    title="Ingresos CXC Cobradas" value={formatMoney(metrics.cxcPaidAmount)} 
                                    icon={TrendingUp} colorClass="bg-emerald-500 text-emerald-500"
                                    subtitle="Ingresos confirmados"
                                />
                            )}
                            <DashboardInfoCard 
                                delayClass="[animation-delay:300ms]"
                                title={user?.role === 'ADMIN' ? "Embarques Pendientes" : "Tus Embarques Pendientes"} 
                                value={metrics.pendingShipmentsCount} 
                                icon={Ship} colorClass="bg-amber-500 text-amber-500"
                                subtitle="En curso (No entregados)"
                            />
                            {user?.role === 'ADMIN' ? (
                                <DashboardInfoCard 
                                    delayClass="[animation-delay:400ms]"
                                    title="CXP pendientes" value={formatMoney(metrics.cxpPendingAmount)} 
                                    icon={CreditCard} colorClass="bg-rose-500 text-rose-500"
                                    subtitle="Deuda pendiente"
                                />
                            ) : (
                                <DashboardInfoCard 
                                    delayClass="[animation-delay:200ms]"
                                    title="Rendimiento Global" value="Óptimo" 
                                    icon={TrendingUp} colorClass="bg-primary text-primary"
                                    subtitle="Métricas operativas en verde"
                                />
                            )}
                        </div>

                        {/* Columna Derecha: Panel de Actividad Reciente (solo ADMIN) */}
                        {user?.role === 'ADMIN' && (
                            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col overflow-hidden max-h-[800px] xl:max-h-none h-full animate-in fade-in-0 slide-in-from-right-4 fill-mode-backwards duration-700 [animation-delay:400ms]">
                                <div className="px-6 py-5 border-b border-slate-100/60 bg-transparent flex items-center justify-between shrink-0">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 tracking-wide">
                                        <div className="p-2 bg-slate-50 rounded-xl">
                                            <Bell className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                        </div>
                                        Actividad Reciente
                                    </h3>
                                    {notifications.length > 0 && (
                                        <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                            {notifications.length}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-50/80 custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2 font-medium">
                                            <Bell className="w-6 h-6 text-slate-300" />
                                            <p>Sin actividad reciente</p>
                                        </div>
                                    ) : notifications.map(notif => (
                                        <button
                                            key={notif.id}
                                            onClick={() => navigateFromNotif(notif)}
                                            className="w-full text-left p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-3 group"
                                        >
                                            <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notifTypeDot[notif.type] || 'bg-blue-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs text-slate-800 leading-tight truncate">{notif.title}</p>
                                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug font-medium">{notif.message}</p>
                                                <span className="text-[10px] text-slate-400 mt-1.5 block font-bold tracking-wider">
                                                    {new Date(notif.createdAt).toLocaleString('es-VE', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    }).toUpperCase()}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Fila 2: Gráficas ──────────────────── */}
                    <div className={`grid gap-6 items-stretch ${
                        user?.role === 'ADMIN' 
                            ? 'grid-cols-1 lg:grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_400px]' 
                            : 'grid-cols-1'
                    }`}>
                        {/* Línea: Cotizaciones Creadas */}
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col min-h-[400px] animate-in fade-in-0 slide-in-from-bottom-6 fill-mode-backwards duration-700 [animation-delay:500ms]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <div className="p-2 bg-slate-50 rounded-xl">
                                        <TrendingUp className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                    </div>
                                    {user?.role === 'ADMIN' ? "Cotizaciones Creadas" : "Tus Cotizaciones Creadas"}
                                </h3>
                                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                    {CHART_RANGE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleChartRangeChange(opt.value)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                chartRange === opt.value 
                                                    ? 'bg-white text-slate-800 shadow-sm' 
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[260px] w-full flex-1" ref={chartRef}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis 
                                            dataKey="dayLabel" axisLine={false} tickLine={false}
                                            tick={{ fontSize: 11, fill: '#64748B' }} dy={10}
                                            interval={chartRange > 1 ? 0 : 'preserveStartEnd'}
                                            angle={chartRange > 3 ? -45 : 0}
                                            textAnchor={chartRange > 3 ? 'end' : 'middle'}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Line 
                                            type="monotone" name="Cotizaciones" dataKey="cotizaciones" 
                                            stroke={secondaryColor} strokeWidth={3}
                                            dot={{ fill: secondaryColor, r: 4, strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Donut: Distribución de servicios en Avisos de Cobro */}
                        {user?.role === 'ADMIN' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col animate-in fade-in-0 slide-in-from-bottom-6 fill-mode-backwards duration-700 [animation-delay:600ms]" ref={donutChartRef}>
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <div className="p-2 bg-slate-50 rounded-xl">
                                            <FileText className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                                        </div>
                                        Servicios en A.C.
                                    </h3>
                                    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                        {CHART_RANGE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleDonutRangeChange(opt.value)}
                                                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                                                    donutRange === opt.value 
                                                        ? 'bg-white text-slate-800 shadow-sm' 
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {serviceDistribution.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                                        <FileText className="w-8 h-8 text-slate-200" />
                                        <p>Sin datos en este período</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 min-h-[160px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                                <PieChart>
                                                    <Pie
                                                        data={serviceDistribution}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius="52%"
                                                        outerRadius="75%"
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        nameKey="name"
                                                    >
                                                        {serviceDistribution.map((entry, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                                                                stroke="transparent"
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(value, name, props) => {
                                                            const pct = totalServiceValue > 0 
                                                                ? ((value / totalServiceValue) * 100).toFixed(1) 
                                                                : 0;
                                                            const label = SERVICE_LABELS[props.payload?.type] || name;
                                                            return [`${pct}% · $${value.toFixed(0)}`, label];
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Leyenda */}
                                        <div className="mt-3 space-y-1.5 overflow-y-auto max-h-[110px] custom-scrollbar">
                                            {serviceDistribution.map((entry, index) => {
                                                const pct = totalServiceValue > 0 ? ((entry.value / totalServiceValue) * 100).toFixed(1) : 0;
                                                return (
                                                    <div key={entry.type} className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                                                        <span className="text-[11px] text-slate-600 truncate flex-1">{SERVICE_LABELS[entry.type] || entry.name}</span>
                                                        <span className="text-[11px] font-semibold text-slate-700 shrink-0">{pct}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Preview Tables ───────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        <PreviewTable 
                            delayClass="[animation-delay:700ms]"
                            title={user?.role === 'ADMIN' ? "Últimas Notas de Entrega" : "Tus Últimas Notas de Entrega"}
                            icon={FileText} items={previews.latestDeliveryNotes} primaryColor={primaryColor}
                            onNavigate={() => navigate('/dashboard/nota-entrega')}
                            emptyMessage="Sin notas emitidas en este rango."
                            renderRow={(dn) => (
                                <div key={dn.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate(`/dashboard/nota-entrega?id=${dn.id}`)}>
                                    <div className="truncate pr-4">
                                        <p className="text-sm font-medium text-slate-800 truncate">{dn.client?.name || 'Cliente desconocido'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">NE-{String(dn.number).padStart(5, '0')}</p>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-full">{formatDate(dn.createdAt)}</span>
                                </div>
                            )}
                        />
                        <PreviewTable 
                            delayClass="[animation-delay:800ms]"
                            title={user?.role === 'ADMIN' ? "Top Clientes" : "Tus Mejores Clientes"}
                            icon={Users} items={previews.topClients} primaryColor={primaryColor}
                            onNavigate={() => navigate('/dashboard/clientes')}
                            emptyMessage="No se han aprobado cotizaciones."
                            renderRow={(client, index) => (
                                <div key={client.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{index + 1}</div>
                                    <div className="truncate flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{client.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{client.internalCode}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-sm font-semibold text-slate-700">{client.totalQuotes}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">Cotizaciones</p>
                                    </div>
                                </div>
                            )}
                        />
                        <PreviewTable 
                            delayClass="[animation-delay:900ms]"
                            title={user?.role === 'ADMIN' ? "Últimos Avisos de Cobro" : "Tus Últimos Avisos de Cobro"}
                            icon={FileText} items={previews.latestPaymentNotices} primaryColor={primaryColor}
                            onNavigate={() => navigate('/dashboard/aviso-cobro')}
                            emptyMessage="Sin avisos emitidos en este rango."
                            renderRow={(pn) => (
                                <div key={pn.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer" onClick={() => navigate(`/dashboard/aviso-cobro?id=${pn.id}`)}>
                                    <div className="truncate pr-4">
                                        <p className="text-sm font-medium text-slate-800 truncate">{pn.client?.name || 'Cliente desconocido'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">AC-{String(pn.number).padStart(5, '0')}</p>
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-full">{formatDate(pn.createdAt)}</span>
                                </div>
                            )}
                        />
                    </div>
                </>
            )}

            {/* Modal de Información - Se muestra las primeras 3 veces */}
            <InformationModal
                isOpen={showInfoModal}
                onClose={closeInfoModal}
            />
        </div>
    );
};

export default Dashboard;
