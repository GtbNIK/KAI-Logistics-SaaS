import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2, Download, Loader2, Container, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import shipmentService from '../../services/shipment.service';

import {
	MONTHS_ES,
	CONTAINER_TYPES,
	CHART_COLORS,
	getInitials,
	getMonthLabel,
	generateMonthlyClosePDF
} from './TrackingMonthlyClosePDF';

// ─── Tabla D2D preview ────────────────────────────────────────────────────────
const D2DTable = ({ data }) => {
    const { users, d2d, d2dTotals, d2dGrand } = data;

    if (d2d.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Package size={40} className="opacity-40" />
                <p className="text-sm">No hay embarques D2D registrados en este período</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-teal-600 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                        {users.map(u => (
                            <th key={u.id} className="px-3 py-3 text-center font-semibold min-w-[70px]" title={u.name}>
                                {getInitials(u.name)}
                            </th>
                        ))}
                        <th className="px-4 py-3 text-right font-semibold bg-teal-700">Total CBM</th>
                    </tr>
                </thead>
                <tbody>
                    {d2d.map((row, idx) => {
                        const rowTotal = users.reduce((s, u) => s + parseFloat(row.cbmByUser[u.id] || 0), 0);
                        return (
                            <tr key={row.clientId || idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="px-4 py-2.5 font-medium text-slate-700">{row.clientName}</td>
                                {users.map(u => {
                                    const v = parseFloat(row.cbmByUser[u.id] || 0);
                                    return (
                                        <td key={u.id} className="px-3 py-2.5 text-center text-slate-600">
                                            {v > 0 ? v.toFixed(2) : <span className="text-slate-300">—</span>}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-2.5 text-right font-bold text-slate-800 bg-teal-50">
                                    {rowTotal.toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-teal-600 text-white font-bold">
                        <td className="px-4 py-3">TOTAL</td>
                        {users.map(u => {
                            const v = parseFloat(d2dTotals[u.id] || 0);
                            return (
                                <td key={u.id} className="px-3 py-3 text-center">
                                    {v > 0 ? v.toFixed(2) : <span className="opacity-40">—</span>}
                                </td>
                            );
                        })}
                        <td className="px-4 py-3 text-right bg-teal-700">
                            {parseFloat(d2dGrand).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

// ─── Tabla FCL preview ────────────────────────────────────────────────────────
const FCLTable = ({ data }) => {
    const { users, fcl, fclTotals, fclGrand } = data;

    if (fcl.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Container size={40} className="opacity-40" />
                <p className="text-sm">No hay embarques FCL registrados en este período</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th rowSpan={2} className="px-4 py-2.5 text-left font-semibold bg-indigo-600 text-white border border-indigo-500 align-middle">
                            Cliente
                        </th>
                        {users.map(u => (
                            <th
                                key={u.id}
                                colSpan={3}
                                className="px-2 py-2.5 text-center font-semibold bg-indigo-600 text-white border border-indigo-500"
                                title={u.name}
                            >
                                {getInitials(u.name)}
                            </th>
                        ))}
                        <th
                            colSpan={3}
                            className="px-2 py-2.5 text-center font-semibold bg-indigo-800 text-white border border-indigo-700"
                        >
                            TOTALES
                        </th>
                    </tr>
                    <tr>
                        {users.flatMap(u =>
                            CONTAINER_TYPES.map(t => (
                                <th key={`${u.id}-${t}`} className="px-2 py-1.5 text-center text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {t}
                                </th>
                            ))
                        )}
                        {CONTAINER_TYPES.map(t => (
                            <th key={`tot-${t}`} className="px-2 py-1.5 text-center text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200">
                                {t}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {fcl.map((row, idx) => {
                        const clientTotals = { '20ft': 0, '40ft': 0, '40HC': 0 };
                        for (const u of users) {
                            const c = row.containersByUser[u.id] || {};
                            CONTAINER_TYPES.forEach(t => { clientTotals[t] += c[t] || 0; });
                        }
                        return (
                            <tr key={row.clientId || idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="px-4 py-2.5 font-medium text-slate-700 border-r border-slate-200">{row.clientName}</td>
                                {users.flatMap(u => {
                                    const c = row.containersByUser[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                                    return CONTAINER_TYPES.map(t => (
                                        <td key={`${u.id}-${t}`} className="px-2 py-2.5 text-center text-slate-600 border border-slate-100">
                                            {c[t] > 0 ? c[t] : <span className="text-slate-300">—</span>}
                                        </td>
                                    ));
                                })}
                                {CONTAINER_TYPES.map(t => (
                                    <td key={`ct-${t}`} className="px-2 py-2.5 text-center font-semibold text-slate-800 border border-indigo-100 bg-indigo-50">
                                        {clientTotals[t] > 0 ? clientTotals[t] : <span className="text-slate-300">—</span>}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-indigo-600 text-white font-bold">
                        <td className="px-4 py-3 border border-indigo-500">TOTAL</td>
                        {users.flatMap(u => {
                            const t = fclTotals[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                            return CONTAINER_TYPES.map(type => (
                                <td key={`tot-${u.id}-${type}`} className="px-2 py-3 text-center border border-indigo-500">
                                    {t[type] > 0 ? t[type] : <span className="opacity-40">—</span>}
                                </td>
                            ));
                        })}
                        {CONTAINER_TYPES.map(t => (
                            <td key={`gp-${t}`} className="px-2 py-3 text-center bg-indigo-800 border border-indigo-700">
                                {fclGrand[t] > 0 ? fclGrand[t] : '—'}
                            </td>
                        ))}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const TrackingMonthlyCloseModal = ({ isOpen, onClose }) => {
    const { settings } = useSettings();
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('d2d');
    const chartsRef = useRef(null);

    const years = useMemo(
        () => Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i),
        []
    );

    const fetchData = useCallback(async () => {
        const month = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        setLoading(true);
        setData(null);
        try {
            const result = await shipmentService.getMonthlyClose(month);
            setData(result);
        } catch (e) {
            console.error('Error fetching monthly close:', e);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    const handleGenerate = async () => {
        if (!data || generating) return;
        setGenerating(true);
        try {
            await generateMonthlyClosePDF({ data, settings, chartsRef });
        } catch (e) {
            console.error('Error generating PDF:', e);
        } finally {
            setGenerating(false);
        }
    };

    const d2dChartData = useMemo(() => {
        if (!data) return [];
        return data.users.map(u => ({
            name: getInitials(u.name),
            CBM: parseFloat((data.d2dTotals[u.id] || 0).toFixed(2))
        }));
    }, [data]);

    const fclChartData = useMemo(() => {
        if (!data) return [];
        return data.users.map(u => {
            const t = data.fclTotals[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
            return {
                name: getInitials(u.name),
                '20ft': t['20ft'],
                '40ft': t['40ft'],
                '40HC': t['40HC']
            };
        });
    }, [data]);

    const monthLabel = data ? getMonthLabel(data.month) : '';

    if (!isOpen || typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl min-h-[60vh] max-h-[80vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-sky-600 rounded-xl">
                            <BarChart2 className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Cierre Mensual de Tracking</h3>
                            <p className="text-sm text-slate-500">Resumen D2D (CBM) y FCL (contenedores) por cliente y vendedor</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        >
                            {MONTHS_ES.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors ml-1"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 px-6 border-b border-slate-200 shrink-0">
                    <button
                        onClick={() => setActiveTab('d2d')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            activeTab === 'd2d'
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Package size={15} />
                        Door to Door
                    </button>
                    <button
                        onClick={() => setActiveTab('fcl')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            activeTab === 'fcl'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Container size={15} />
                        FCL
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            activeTab === 'charts'
                                ? 'border-sky-500 text-sky-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <BarChart2 size={15} />
                        Gráficas
                    </button>
                </div>

                {/* Cuerpo con tablas */}
                <div className="flex-1 overflow-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-sky-600" size={32} />
                        </div>
                    )}

                    {!loading && data && activeTab === 'd2d' && (
                        <D2DTable data={data} />
                    )}

                    {!loading && data && activeTab === 'fcl' && (
                        <FCLTable data={data} />
                    )}

                    {!loading && data && activeTab === 'charts' && (
                        <div className="p-4">
                            <h2 className="text-center mb-6 text-slate-800 font-bold text-base">Gráficas de Cierre — {monthLabel}</h2>
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch justify-center min-h-[420px]">
                                {/* D2D CBM por vendedor */}
                                <div className="flex-1 border border-slate-200 rounded-xl p-4">
                                    <p className="text-center mb-3 text-slate-600 text-sm font-semibold">
                                        CBM Total por Vendedor — D2D
                                    </p>
                                    <div className="flex items-center justify-center">
                                        <PieChart width={360} height={350}>
                                            <Pie
                                                data={d2dChartData.filter(d => d.CBM > 0)}
                                                dataKey="CBM"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={150}
                                                startAngle={90}
                                                endAngle={-270}
                                                paddingAngle={d2dChartData.filter(d => d.CBM > 0).length > 1 ? 3 : 0}
                                                labelLine={true}
                                            >
                                                {d2dChartData.map((_, idx) => (
                                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} CBM`, 'CBM']} />
                                            <Legend
                                                content={(props) => {
                                                    const { payload } = props;
                                                    const total = d2dChartData.reduce((s, d) => s + d.CBM, 0);
                                                    return (
                                                        <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px' }}>
                                                            {payload.map((entry, idx) => {
                                                                const item = d2dChartData.find(d => d.name === entry.value);
                                                                const pct = total > 0 ? ((item?.CBM || 0) / total * 100).toFixed(1) : '0.0';
                                                                return (
                                                                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#334155' }}>
                                                                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
                                                                        <span><strong>{entry.value}</strong>: {pct}% <span style={{ color: '#64748b' }}>({(item?.CBM || 0).toFixed(2)} CBM)</span></span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    );
                                                }}
                                            />
                                        </PieChart>
                                    </div>
                                </div>

                                {/* FCL contenedores por vendedor */}
                                <div className="flex-1 border border-slate-200 rounded-xl p-4">
                                    <p className="text-center mb-3 text-slate-600 text-sm font-semibold">
                                        Contenedores por Vendedor — FCL
                                    </p>
                                    <div className="flex items-center justify-center">
                                        <BarChart width={360} height={300} data={fclChartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="20ft" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="40ft" fill="#f97316" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="40HC" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !data && (
                        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                            No se pudo cargar la información del período
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400">
                        El PDF generará: Pág. 1 — D2D · Pág. 2 — FCL · Pág. 3 — Gráficas
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={generating}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!data || generating || loading}
                            className="px-5 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow shadow-sky-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {generating ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Generando PDF...
                                </>
                            ) : (
                                <>
                                    <Download size={15} />
                                    Generar PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Div oculto para captura de gráficas con html2canvas */}
            {data && (
                <div
                    ref={chartsRef}
                    style={{
                        position: 'fixed',
                        top: '-10000px',
                        left: '-10000px',
                        width: '660px',
                        padding: '24px',
                        backgroundColor: '#ffffff',
                        fontFamily: 'Helvetica, Arial, sans-serif'
                    }}
                >
                    <h2 style={{
                        textAlign: 'center',
                        marginBottom: '28px',
                        color: '#1e293b',
                        fontSize: '15px',
                        fontWeight: 'bold'
                    }}>
                        Gráficas de Cierre — {monthLabel}
                    </h2>
                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', minHeight: '380px' }}>
                        {/* D2D CBM por vendedor */}
                        <div style={{ flex: 1 }}>
                            <p style={{
                                textAlign: 'center',
                                marginBottom: '12px',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                CBM Total por Vendedor — D2D
                            </p>
                            <div style={{ marginTop: '16px' }}>
                                <PieChart width={280} height={260}>
                                <Pie
                                    data={d2dChartData.filter(d => d.CBM > 0)}
                                    dataKey="CBM"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    startAngle={90}
                                    endAngle={-270}
                                    paddingAngle={d2dChartData.filter(d => d.CBM > 0).length > 1 ? 3 : 0}
                                    labelLine={true}
                                >
                                    {d2dChartData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} CBM`, 'CBM']} />
                                <Legend
                                    content={(props) => {
                                        const { payload } = props;
                                        const total = d2dChartData.reduce((s, d) => s + d.CBM, 0);
                                        return (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 14px' }}>
                                                {payload.map((entry, idx) => {
                                                    const item = d2dChartData.find(d => d.name === entry.value);
                                                    const pct = total > 0 ? ((item?.CBM || 0) / total * 100).toFixed(1) : '0.0';
                                                    return (
                                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#334155' }}>
                                                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
                                                            <span><strong>{entry.value}</strong>: {pct}% <span style={{ color: '#64748b' }}>({(item?.CBM || 0).toFixed(2)} CBM)</span></span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        );
                                    }}
                                />
                            </PieChart>
                            </div>
                        </div>

                        {/* FCL contenedores por vendedor */}
                        <div style={{ flex: 1 }}>
                            <p style={{
                                textAlign: 'center',
                                marginBottom: '12px',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                Contenedores por Vendedor — FCL
                            </p>
                            <BarChart width={280} height={260} data={fclChartData} margin={{ top: 10, right: 15, bottom: 10, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#475569' }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="20ft" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="40ft" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="40HC" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default TrackingMonthlyCloseModal;
