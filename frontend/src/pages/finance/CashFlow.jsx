import { useState, useEffect, useCallback } from 'react';
import { Landmark, TrendingUp, TrendingDown, Wallet, RefreshCw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import cashFlowService from '../../services/cash-flow.service';
import { useToast } from '../../context/ToastContext';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'numeric', year: '2-digit' }) : '—';

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
const KpiCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4`}>
        <div className={`p-3 rounded-xl ${bgClass}`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
        </div>
    </div>
);

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
    const [summary,  setSummary]  = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0 });
    const [ingresos, setIngresos] = useState([]);
    const [egresos,  setEgresos]  = useState([]);
    const [loading,  setLoading]  = useState(true);

    // Construye YYYY-MM-DD a partir de los selects
    const buildDate = (day, month, year) => {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await cashFlowService.getCashFlow({
                startDate: buildDate(applied.fromDay, applied.fromMonth, applied.fromYear),
                endDate:   buildDate(applied.toDay,   applied.toMonth,   applied.toYear)
            });
            setSummary(res.summary);
            setIngresos(res.ingresos);
            setEgresos(res.egresos);
        } catch (err) {
            console.error(err);
            showError('Error', 'No se pudo cargar el balance financiero');
        } finally {
            setLoading(false);
        }
    }, [applied]);

    // Sólo se ejecuta cuando cambia `applied` (al hacer clic en Aplicar)
    useEffect(() => { fetchData(); }, [fetchData]);

    // Handler del botón Aplicar: copia el draft al estado aplicado
    const handleApply = () => {
        setApplied({ fromDay, fromMonth, fromYear, toDay, toMonth, toYear });
    };

    const balancePositive = summary.balance >= 0;

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
                    <button
                        onClick={handleApply}
                        disabled={loading}
                        style={{ backgroundColor: primaryColor }}
                        className="flex items-center gap-2 text-white px-5 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />
                        }
                        Aplicar
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard
                    title="Total Ingresos"
                    value={formatMoney(summary.totalIngresos)}
                    icon={TrendingUp}
                    colorClass="text-emerald-600"
                    bgClass="bg-emerald-50"
                />
                <KpiCard
                    title="Total Egresos"
                    value={formatMoney(summary.totalEgresos)}
                    icon={TrendingDown}
                    colorClass="text-rose-600"
                    bgClass="bg-rose-50"
                />
                <KpiCard
                    title="Balance Neto"
                    value={formatMoney(summary.balance)}
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
                                ) : ingresos.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                                        <td className="px-1 py-3 text-slate-800 font-medium max-w-[120px] truncate">
                                            {t.receivable?.client?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {t.receivable?.paymentNotice?.number ? `AVC-${t.receivable.paymentNotice.number}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                                            {formatMoney(t.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">{getMethodLabel(t.method)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">{t.reference || '---'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <TrEmpty colSpan={4} message="Cargando..." />
                                ) : egresos.length === 0 ? (
                                    <TrEmpty colSpan={4} message="Sin egresos en este período" />
                                ) : egresos.map(t => {
                                    // ally o svcProvider, no ambos
                                    const parte = t.payable?.ally?.name || t.payable?.svcProvider?.name || '—';
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(t.date)}</td>
                                            <td className="px-4 py-3 max-w-[160px]">
                                                <p className="font-medium text-slate-800 truncate">{t.payable?.description || '—'}</p>
                                                <p className="text-xs text-slate-400 truncate">{parte}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                                                {formatMoney(t.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{getMethodLabel(t.method)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CashFlow;
