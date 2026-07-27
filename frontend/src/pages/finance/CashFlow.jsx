import { useState, useEffect, useCallback, useMemo } from 'react';
import { Landmark, TrendingUp, TrendingDown, Wallet, RefreshCw, FileText } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { dateToStringHelper } from '../../utils/dateHelpers';
import cashFlowService from '../../services/cash-flow.service';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/currency';
import CashFlowReportPDF from '../../components/finance/CashFlowReportPDF';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (d) =>
    d ? dateToStringHelper(d, { style: 'slash', shortYear: true }) : '—';

// Métodos de pago en español (mismo mapa que PayableDetailModal)
const PAYMENT_METHODS = {
    TRANSFER:      'Transferencia Bancaria',
    INTL_TRANSFER: 'Transferencia Internacional',
    P_MOBILE:      'Pago Móvil',
    BINANCE_USDT:  'Binance (USDT)',
    ZELLE:         'Zelle',
    CASH_USD:      'Efectivo USD',
    OTHER:         'Otro',
};
const getMethodLabel = (method) => PAYMENT_METHODS[method] || method || '—';

const ITEMS_PER_PAGE = 15;

const formatRangeLabel = ({
    fromDay,
    fromMonth,
    fromYear,
    toDay,
    toMonth,
    toYear
}) => {
    const build = (day, month, year) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const fromStr = dateToStringHelper(build(fromDay, fromMonth, fromYear), { style: 'text' });
    const toStr   = dateToStringHelper(build(toDay,   toMonth,   toYear),   { style: 'text' });
    return `${fromStr} al ${toStr}`;
};

// Meses
const MONTHS = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const currentYear = new Date().getFullYear();
const YEARS  = Array.from({ length: 6 }, (_, i) => currentYear - i);

// Días reales del mes (respeta años bisiestos)
const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
const buildDays = (month, year) => Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1);

// ─── Sub-componente: Selector de Fecha ──────────────────────────────────────
const DateSelector = ({ label, day, month, year, onDay, onMonth, onYear }) => {
    const days = buildDays(month, year);
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            <div className="flex gap-2">
                {/* Día */}
                <select
                    value={day}
                    onChange={e => onDay(Number(e.target.value))}
                    className="px-2 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700"
                >
                    {days.map(d => (
                        <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                    ))}
                </select>
                {/* Mes */}
                <select
                    value={month}
                    onChange={e => {
                        const newMonth = Number(e.target.value);
                        onMonth(newMonth);
                        // Corregir día si supera el máximo del nuevo mes
                        const maxDay = getDaysInMonth(newMonth, year);
                        if (day > maxDay) onDay(maxDay);
                    }}
                    className="px-2 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700"
                >
                    {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
                {/* Año */}
                <select
                    value={year}
                    onChange={e => {
                        const newYear = Number(e.target.value);
                        onYear(newYear);
                        // Corregir día si el año cambia (febrero año bisiesto)
                        const maxDay = getDaysInMonth(month, newYear);
                        if (day > maxDay) onDay(maxDay);
                    }}
                    className="px-2 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700"
                >
                    {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

        </div>
    );
};

// ─── Sub-componente: KPI Card ────────────────────────────────────────────────
const KpiCard = ({ title, value, icon, colorClass, bgClass, subtitle }) => {
    const Icon = icon;
    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4`}>
            <div className={`p-3 rounded-xl ${bgClass}`}>
                <Icon className={`w-6 h-6 ${colorClass}`} />
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
                <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
};

// ─── Sub-componente: Tabla ───────────────────────────────────────────────────
const TrEmpty = ({ colSpan, message }) => (
    <tr>
        <td colSpan={colSpan} className="py-10 text-center text-sm text-slate-400 italic">
            {message}
        </td>
    </tr>
);

// ─── Página Principal ────────────────────────────────────────────────────────
const now = new Date();

const CashFlow = () => {
    const { settings } = useSettings();
    const { showError } = useToast();
    const primaryColor = settings?.primaryColor || '#0ea5e9';

    // ─── Estados "draft" (lo que el usuario ve mientras elige) ───────────────
    const [fromDay,   setFromDay]   = useState(1);
    const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
    const [fromYear,  setFromYear]  = useState(now.getFullYear());

    const [toDay,   setToDay]   = useState(now.getDate());
    const [toMonth, setToMonth] = useState(now.getMonth() + 1);
    const [toYear,  setToYear]  = useState(now.getFullYear());

    // ─── Estados "aplicados" (los que disparan la petición al hacer Aplicar) ──
    const [applied, setApplied] = useState({
        fromDay: 1, fromMonth: now.getMonth() + 1, fromYear: now.getFullYear(),
        toDay:   now.getDate(), toMonth: now.getMonth() + 1, toYear: now.getFullYear()
    });

    // Estado de datos
    const [summary,  setSummary]  = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0, estimatedIngresos: 0, estimatedEgresos: 0 });
    const [ingresos, setIngresos] = useState([]);
    const [egresos,  setEgresos]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [incomePage, setIncomePage] = useState(1);
    const [expensePage, setExpensePage] = useState(1);

    // Construye YYYY-MM-DD a partir de los selects
    const buildDate = (day, month, year) => {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const start = `${buildDate(applied.fromDay, applied.fromMonth, applied.fromYear)}T00:00:00`;
            const end   = `${buildDate(applied.toDay,   applied.toMonth,   applied.toYear)}T23:59:59.999`;
            const res = await cashFlowService.getCashFlow({ startDate: start, endDate: end });
            setSummary(res.summary);
            setIngresos(res.ingresos);
            setEgresos(res.egresos);
            setIncomePage(1);
            setExpensePage(1);
        } catch (err) {
            console.error(err);
            showError('Error', 'No se pudo cargar el balance financiero');
        } finally {
            setLoading(false);
        }
    }, [applied, showError]);

    // Sólo se ejecuta cuando cambia `applied` (al hacer clic en Aplicar)
    useEffect(() => { fetchData(); }, [fetchData]);

    // Handler del botón Aplicar: copia el draft al estado aplicado
    const handleApply = () => {
        setApplied({ fromDay, fromMonth, fromYear, toDay, toMonth, toYear });
    };

    const balancePositive = summary.balance >= 0;
    const dateRangeLabel = formatRangeLabel(applied);
    const hasData = ingresos.length > 0 || egresos.length > 0;
    const totalIncomePages = Math.max(1, Math.ceil(ingresos.length / ITEMS_PER_PAGE));
    const totalExpensePages = Math.max(1, Math.ceil(egresos.length / ITEMS_PER_PAGE));

    useEffect(() => {
        if (incomePage > totalIncomePages) {
            setIncomePage(totalIncomePages);
        }
    }, [incomePage, totalIncomePages]);

    useEffect(() => {
        if (expensePage > totalExpensePages) {
            setExpensePage(totalExpensePages);
        }
    }, [expensePage, totalExpensePages]);

    const pagedIngresos = useMemo(() => {
        const start = (incomePage - 1) * ITEMS_PER_PAGE;
        return ingresos.slice(start, start + ITEMS_PER_PAGE);
    }, [ingresos, incomePage]);

    const pagedEgresos = useMemo(() => {
        const start = (expensePage - 1) * ITEMS_PER_PAGE;
        return egresos.slice(start, start + ITEMS_PER_PAGE);
    }, [egresos, expensePage]);

    return (
        <div className="space-y-6">

            {/* ── Cabecera ───────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${primaryColor}15` }}>
                    <Landmark className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Balance Financiero</h1>
                    <p className="text-slate-500 text-sm">Ingresos y egresos registrados en el periodo seleccionado</p>
                </div>
            </div>

            {/* ── Selector de Fechas (centrado y prominente) ─────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex flex-wrap justify-center gap-6 items-end">
                    <DateSelector
                        label="Desde"
                        day={fromDay}   month={fromMonth}   year={fromYear}
                        onDay={setFromDay} onMonth={setFromMonth} onYear={setFromYear}
                    />
                    <div className="pb-2 text-slate-400 font-bold text-lg select-none">→</div>
                    <DateSelector
                        label="Hasta"
                        day={toDay}   month={toMonth}   year={toYear}
                        onDay={setToDay} onMonth={setToMonth} onYear={setToYear}
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={handleApply}
                            disabled={loading}
                            style={{ backgroundColor: primaryColor }}
                            className="flex items-center justify-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <RefreshCw className="w-4 h-4" />
                            }
                            Aplicar
                        </button>
                        <button
                            onClick={() => setReportModalOpen(true)}
                            disabled={loading || !hasData}
                            style={{ backgroundColor: '#F58927' }}
                            className="flex items-center justify-center gap-2 text-sm font-medium px-5 py-2 rounded-lg text-white hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="w-4 h-4" />
                            Generar PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    title="Total Ingresos"
                    value={formatCurrency(summary.totalIngresos, 'USD')}
                    icon={TrendingUp}
                    colorClass="text-emerald-600"
                    bgClass="bg-emerald-50"
                    subtitle={`Estimado en el rango de fechas: ${formatCurrency(summary.estimatedIngresos, 'USD')}`}
                />
                <KpiCard
                    title="Total Egresos"
                    value={formatCurrency(summary.totalEgresos, 'USD')}
                    icon={TrendingDown}
                    colorClass="text-rose-600"
                    bgClass="bg-rose-50"
                    subtitle={`Estimado en el rango de fechas: ${formatCurrency(summary.estimatedEgresos, 'USD')}`}
                />
                <KpiCard
                    title="Balance Neto"
                    value={formatCurrency(summary.balance, 'USD')}
                    icon={Wallet}
                    colorClass={balancePositive ? 'text-blue-700' : 'text-rose-700'}
                    bgClass={balancePositive ? 'bg-blue-50' : 'bg-rose-50'}
                />
            </div>

            {/* ── Tablas en Columnas ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Tabla Ingresos */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 bg-emerald-50/60 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">Ingresos <span className="text-slate-400 font-normal">({ingresos.length})</span></h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nro. A.C.</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Referencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <TrEmpty colSpan={6} message="Cargando..." />
                                ) : ingresos.length === 0 ? (
                                    <TrEmpty colSpan={6} message="Sin ingresos en este período" />
                                ) : pagedIngresos.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date || t.createdAt)}</td>
                                        <td className="px-1 py-3 text-slate-800 font-medium max-w-[120px] truncate">
                                            {t.receivable?.client?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {t.receivable?.paymentNotice?.number ? `AVC-${t.receivable.paymentNotice.number}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                                            {formatCurrency(t.amount, t.receivable?.currency || 'USD')}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{getMethodLabel(t.method)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{t.reference || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalIncomePages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60">
                            <button
                                onClick={() => setIncomePage(p => Math.max(1, p - 1))}
                                disabled={incomePage === 1}
                                className="px-3 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span>Página {incomePage} de {totalIncomePages}</span>
                            <button
                                onClick={() => setIncomePage(p => Math.min(totalIncomePages, p + 1))}
                                disabled={incomePage === totalIncomePages}
                                className="px-3 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabla Egresos */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/60 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                        <h3 className="font-semibold text-slate-800 text-sm">Egresos <span className="text-slate-400 font-normal">({egresos.length})</span></h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Concepto / Parte</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Monto</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Método</th>
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Referencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <TrEmpty colSpan={5} message="Cargando..." />
                                ) : egresos.length === 0 ? (
                                    <TrEmpty colSpan={5} message="Sin egresos en este período" />
                                ) : pagedEgresos.map(t => {
                                    const emp = t.payable?.employeeUser;
                                    const parte = t.payable?.ally?.name || t.payable?.svcProvider?.name || (emp ? `${emp.name}${emp.position ? ' — ' + emp.position : ''}` : '—');
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date || t.createdAt)}</td>
                                            <td className="px-4 py-3 max-w-[160px]">
                                                <p className="font-medium text-slate-800 truncate">{t.payable?.description || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">{parte}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                                            {formatCurrency(t.amount, t.payable?.currency || 'USD')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{getMethodLabel(t.method)}</td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">{t.reference || '---'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalExpensePages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60">
                            <button
                                onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                                disabled={expensePage === 1}
                                className="px-3 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span>Página {expensePage} de {totalExpensePages}</span>
                            <button
                                onClick={() => setExpensePage(p => Math.min(totalExpensePages, p + 1))}
                                disabled={expensePage === totalExpensePages}
                                className="px-3 py-1 rounded-md border border-slate-200 bg-white disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>

            </div>

            <CashFlowReportPDF
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                ingresos={ingresos}
                egresos={egresos}
                dateRangeLabel={dateRangeLabel}
                paymentMethodsMap={PAYMENT_METHODS}
            />
        </div>
    );
};

export default CashFlow;
