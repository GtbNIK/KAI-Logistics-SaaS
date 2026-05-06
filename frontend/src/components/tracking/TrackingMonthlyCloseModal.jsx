import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart2, Download, Loader2, Container, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import shipmentService from '../../services/shipment.service';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MONTHS_ES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const CONTAINER_TYPES = ['20ft', '40ft', '40HC'];
const CHART_COLORS = ['#0ea5e9','#f97316','#10b981','#8b5cf6','#f43f5e','#eab308','#06b6d4'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return r
        ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
        : { r: 14, g: 165, b: 233 };
};

const getInitials = (name = '') =>
    name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('.');

const getMonthLabel = (monthStr) => {
    const [yr, mn] = monthStr.split('-').map(Number);
    return `${MONTHS_ES[mn - 1]} ${yr}`;
};

const getFullAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

const loadLogoAsPngDataUrl = async (url) => {
    if (!url) return null;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const scale = Math.min(300 / img.width, 100 / img.height, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = getFullAssetUrl(url);
    });
};

// ─── PDF: header por página ───────────────────────────────────────────────────
const addPageHeader = (doc, logoPng, companyName, title, rgb, pageW) => {
    if (logoPng) {
        doc.addImage(logoPng, 'PNG', 12, 7, 35, 16);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.text(title, pageW / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(companyName, pageW / 2, 22, { align: 'center' });
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    doc.setLineWidth(0.4);
    doc.line(12, 26, pageW - 12, 26);
};

// ─── PDF: generador principal ─────────────────────────────────────────────────
const generateMonthlyClosePDF = async ({ data, settings, chartsRef }) => {
    const companyName = settings?.companyName || 'ERP Logística';
    const primaryColor = settings?.primaryColor || '#0ea5e9';
    const logoUrl = settings?.logoUrl || '/1.png';
    const rgb = hexToRgb(primaryColor);
    const monthLabel = getMonthLabel(data.month);

    let logoPng = null;
    try { logoPng = await loadLogoAsPngDataUrl(logoUrl); } catch {}

    const doc = new jsPDF('l', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── Página 1: D2D ──
    addPageHeader(doc, logoPng, companyName, `Cierre Mensual D2D — ${monthLabel}`, rgb, pageW);

    if (data.d2d.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(140, 140, 140);
        doc.text('No hay embarques D2D registrados en este período.', pageW / 2, 50, { align: 'center' });
    } else {
        const userInitials = data.users.map(u => getInitials(u.name));
        const d2dHead = [['Cliente', ...userInitials, 'Total CBM']];

        const d2dBody = data.d2d.map(row => {
            const rowTotal = data.users.reduce((s, u) => s + parseFloat(row.cbmByUser[u.id] || 0), 0);
            return [
                row.clientName,
                ...data.users.map(u => {
                    const v = parseFloat(row.cbmByUser[u.id] || 0);
                    return v > 0 ? v.toFixed(2) : '—';
                }),
                rowTotal.toFixed(2)
            ];
        });

        const d2dFoot = [[
            'TOTAL',
            ...data.users.map(u => {
                const v = parseFloat(data.d2dTotals[u.id] || 0);
                return v > 0 ? v.toFixed(2) : '—';
            }),
            parseFloat(data.d2dGrand).toFixed(2)
        ]];

        autoTable(doc, {
            startY: 30,
            margin: { left: 12, right: 12 },
            head: d2dHead,
            body: d2dBody,
            foot: d2dFoot,
            showFoot: 'lastPage',
            theme: 'grid',
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center'
            },
            bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
            footStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 48, fontStyle: 'bold', halign: 'left' },
            }
        });
    }

    // ── Página 2: FCL ──
    doc.addPage();
    addPageHeader(doc, logoPng, companyName, `Cierre Mensual FCL — ${monthLabel}`, rgb, pageW);

    if (data.fcl.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(140, 140, 140);
        doc.text('No hay embarques FCL registrados en este período.', pageW / 2, 50, { align: 'center' });
    } else {
        const fclHead = [[
            'Cliente',
            ...data.users.flatMap(u => [
                `${getInitials(u.name)} 20'`,
                `${getInitials(u.name)} 40'`,
                `${getInitials(u.name)} 40HC`
            ]),
            "Tot. 20'", "Tot. 40'", 'Tot. 40HC'
        ]];

        const fclBody = data.fcl.map(row => {
            const clientTotals = { '20ft': 0, '40ft': 0, '40HC': 0 };
            const userCells = data.users.flatMap(u => {
                const c = row.containersByUser[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                CONTAINER_TYPES.forEach(t => { clientTotals[t] += c[t] || 0; });
                return [
                    c['20ft'] > 0 ? c['20ft'] : '—',
                    c['40ft'] > 0 ? c['40ft'] : '—',
                    c['40HC'] > 0 ? c['40HC'] : '—'
                ];
            });
            return [
                row.clientName,
                ...userCells,
                clientTotals['20ft'] > 0 ? clientTotals['20ft'] : '—',
                clientTotals['40ft'] > 0 ? clientTotals['40ft'] : '—',
                clientTotals['40HC'] > 0 ? clientTotals['40HC'] : '—'
            ];
        });

        const fclFoot = [[
            'TOTAL',
            ...data.users.flatMap(u => {
                const t = data.fclTotals[u.id] || { '20ft': 0, '40ft': 0, '40HC': 0 };
                return [
                    t['20ft'] > 0 ? t['20ft'] : '—',
                    t['40ft'] > 0 ? t['40ft'] : '—',
                    t['40HC'] > 0 ? t['40HC'] : '—'
                ];
            }),
            data.fclGrand['20ft'] > 0 ? data.fclGrand['20ft'] : '—',
            data.fclGrand['40ft'] > 0 ? data.fclGrand['40ft'] : '—',
            data.fclGrand['40HC'] > 0 ? data.fclGrand['40HC'] : '—'
        ]];

        autoTable(doc, {
            startY: 30,
            margin: { left: 12, right: 12 },
            head: fclHead,
            body: fclBody,
            foot: fclFoot,
            showFoot: 'lastPage',
            theme: 'grid',
            headStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            bodyStyles: { fontSize: 7, textColor: [40, 40, 40], halign: 'center' },
            footStyles: {
                fillColor: [rgb.r, rgb.g, rgb.b],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 42, fontStyle: 'bold', halign: 'left' }
            }
        });
    }

    // ── Página 3: Gráficas ──
    doc.addPage();
    addPageHeader(doc, logoPng, companyName, `Gráficas — ${monthLabel}`, rgb, pageW);

    if (chartsRef?.current) {
        try {
            const canvas = await html2canvas(chartsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            const imgData = canvas.toDataURL('image/png');
            const imgW = pageW - 24;
            const imgH = (canvas.height / canvas.width) * imgW;
            doc.addImage(imgData, 'PNG', 12, 32, imgW, Math.min(imgH, pageH - 48));
        } catch (err) {
            console.warn('No se pudieron capturar las gráficas:', err);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(140, 140, 140);
            doc.text('Las gráficas no pudieron ser generadas.', pageW / 2, 50, { align: 'center' });
        }
    }

    // Footer en todas las páginas
    const today = new Date().toLocaleDateString('es-VE');
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(`${companyName} — ${today}`, pageW / 2, pageH - 6, { align: 'center' });
        doc.text(`${page} / ${totalPages}`, pageW - 12, pageH - 6, { align: 'right' });
    }

    doc.save(`Cierre_Mensual_${data.month}.pdf`);
};

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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

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
                        {data && (
                            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                                {data.d2d.length}
                            </span>
                        )}
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
                        {data && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                                {data.fcl.length}
                            </span>
                        )}
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

                    {!loading && !data && (
                        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                            No se pudo cargar la información del período
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400">
                        El PDF generará: Pg. 1 — D2D · Pg. 2 — FCL · Pg. 3 — Gráficas
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
                        width: '880px',
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
                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
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
                            <BarChart width={390} height={280} data={d2dChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                                <Tooltip />
                                <Bar dataKey="CBM" name="CBM" radius={[4, 4, 0, 0]}>
                                    {d2dChartData.map((_, idx) => (
                                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
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
                            <BarChart width={390} height={280} data={fclChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default TrackingMonthlyCloseModal;
