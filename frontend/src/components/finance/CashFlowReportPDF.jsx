import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../context/SettingsContext';

const DEFAULT_LOGO = '/1.png';
const DEFAULT_COMPANY_NAME = 'ERP Logística';
const DEFAULT_COMPANY_RIF = 'J-00000000-0';
const FALLBACK_METHOD_KEY = '__NO_METHOD__';

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 14, g: 165, b: 233 };
};

const formatMoney = (val = 0) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

const getFullAssetUrl = (path) => {
    if (!path) return '';
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}${path}`;
        }
        return `${API_BASE}${path}`;
    }
    return `${API_BASE}/${path.replace(/^\//, '')}`;
};

const loadLogoAsPngDataUrl = async (url) => {
    if (!url) return null;
    const fullUrl = getFullAssetUrl(url);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const maxWidth = 450;
                const maxHeight = 200;
                const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = reject;
        img.src = fullUrl;
    });
};

const buildMethodGroups = (ingresos, egresos, paymentMethodsMap) => {
    const methodOrder = paymentMethodsMap ? Object.keys(paymentMethodsMap) : [];
    const groups = new Map();

    const getLabel = (methodKey) => paymentMethodsMap?.[methodKey] || methodKey || 'Sin método registrado';

    const ensureGroup = (methodKey) => {
        const key = methodKey || FALLBACK_METHOD_KEY;
        if (!groups.has(key)) {
            groups.set(key, {
                method: key,
                label: key === FALLBACK_METHOD_KEY ? 'Sin método registrado' : getLabel(methodKey),
                ingresos: [],
                egresos: []
            });
        }
        return groups.get(key);
    };

    ingresos.forEach(tx => ensureGroup(tx.method).ingresos.push(tx));
    egresos.forEach(tx => ensureGroup(tx.method).egresos.push(tx));
    methodOrder.forEach(key => ensureGroup(key));

    const additionalKeys = [...groups.keys()].filter(key => !methodOrder.includes(key));
    const orderedKeys = [...methodOrder, ...additionalKeys.filter(key => key !== FALLBACK_METHOD_KEY), FALLBACK_METHOD_KEY]
        .filter((key, index, arr) => groups.has(key) && arr.indexOf(key) === index);

    return orderedKeys.map(key => groups.get(key)).filter(Boolean);
};

const ensureSpaceFor = (doc, currentY, minSpace = 50) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (currentY > pageH - minSpace) {
        doc.addPage('a4', 'landscape');
        return 20;
    }
    return currentY;
};

const CashFlowReportPDF = ({
    isOpen,
    onClose,
    ingresos = [],
    egresos = [],
    dateRangeLabel = '',
    paymentMethodsMap = {}
}) => {
    const { settings } = useSettings();
    const [generating, setGenerating] = useState(false);

    const methodGroups = useMemo(
        () => buildMethodGroups(ingresos, egresos, paymentMethodsMap),
        [ingresos, egresos, paymentMethodsMap]
    );

    if (!isOpen) return null;

    const companyName = settings?.companyName || DEFAULT_COMPANY_NAME;
    const companyRif = settings?.rif || settings?.companyRif || DEFAULT_COMPANY_RIF;
    const logoUrl = settings?.logoUrl || DEFAULT_LOGO;
    const primaryColor = settings?.primaryColor || '#0ea5e9';
    const rgb = hexToRgb(primaryColor);

    const handleGenerate = async () => {
        if (generating) return;
        setGenerating(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            try {
                const logoPng = await loadLogoAsPngDataUrl(logoUrl);
                if (logoPng) {
                    doc.addImage(logoPng, 'PNG', 15, 10, 40, 18);
                }
            } catch (error) {
                console.warn('Error loading logo for cash flow PDF:', error);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
            doc.text('Reporte de Flujo de Caja', pageW / 2, 18, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            doc.text(companyName, pageW / 2, 26, { align: 'center' });
            if (companyRif) {
                doc.text(companyRif, pageW / 2, 32, { align: 'center' });
            }
            if (dateRangeLabel) {
                doc.text(`Período: ${dateRangeLabel}`, pageW - 15, 18, { align: 'right' });
            }

            let currentY = 40;

            methodGroups.forEach((group, index) => {
                currentY = ensureSpaceFor(doc, currentY, 70);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13);
                doc.setTextColor(rgb.r, rgb.g, rgb.b);
                doc.text(`Método: ${group.label}`, 15, currentY);
                currentY += 6;

                const hasIngresos = group.ingresos.length > 0;
                const hasEgresos = group.egresos.length > 0;

                if (!hasIngresos && !hasEgresos) {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(11);
                    doc.setTextColor(120, 120, 120);
                    doc.text(
                        `No se realizaron pagos mediante el método "${group.label}" en este período.`,
                        20,
                        currentY
                    );
                    currentY += 12;
                    return;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(60, 60, 60);

                if (hasIngresos) {
                    doc.text('Ingresos', 20, currentY);
                    currentY += 4;
                    autoTable(doc, {
                        startY: currentY,
                        margin: { left: 15, right: 15 },
                        head: [[
                            'Fecha',
                            'Cliente',
                            'Nro. AVC',
                            'Monto',
                            'Método',
                            'Referencia'
                        ]],
                        body: group.ingresos.map(tx => [
                            formatDate(tx.date || tx.createdAt),
                            tx.receivable?.client?.name || '—',
                            tx.receivable?.paymentNotice?.number
                                ? `AVC-${tx.receivable.paymentNotice.number}`
                                : '—',
                            formatMoney(tx.amount),
                            paymentMethodsMap?.[tx.method] || tx.method || '—',
                            tx.reference || '—'
                        ]),
                        theme: 'grid',
                        headStyles: {
                            fillColor: [rgb.r, rgb.g, rgb.b],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            fontSize: 9
                        },
                        bodyStyles: {
                            fontSize: 8,
                            textColor: [40, 40, 40]
                        },
                        columnStyles: {
                            0: { cellWidth: 24 },
                            1: { cellWidth: 55 },
                            2: { cellWidth: 28 },
                            3: { cellWidth: 26, halign: 'right' },
                            4: { cellWidth: 40 },
                            5: { cellWidth: 45 }
                        }
                    });
                    currentY = doc.lastAutoTable.finalY + 8;
                } else {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(10);
                    doc.setTextColor(120, 120, 120);
                    doc.text('Sin ingresos registrados para este método.', 20, currentY);
                    currentY += 8;
                }

                currentY = ensureSpaceFor(doc, currentY, 60);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(60, 60, 60);

                if (hasEgresos) {
                    doc.text('Egresos', 20, currentY);
                    currentY += 4;
                    autoTable(doc, {
                        startY: currentY,
                        margin: { left: 15, right: 15 },
                        head: [[
                            'Fecha',
                            'Concepto / Parte',
                            'Monto',
                            'Método',
                            'Referencia'
                        ]],
                        body: group.egresos.map(tx => {
                            const parte = tx.payable?.ally?.name || tx.payable?.svcProvider?.name || '—';
                            const description = tx.payable?.description || '—';
                            return [
                                formatDate(tx.date),
                                `${description}${parte && parte !== '—' ? `\n${parte}` : ''}`,
                                formatMoney(tx.amount),
                                paymentMethodsMap?.[tx.method] || tx.method || '—',
                                tx.reference || '—'
                            ];
                        }),
                        theme: 'grid',
                        headStyles: {
                            fillColor: [rgb.r, rgb.g, rgb.b],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            fontSize: 9
                        },
                        bodyStyles: {
                            fontSize: 8,
                            textColor: [40, 40, 40]
                        },
                        columnStyles: {
                            0: { cellWidth: 24 },
                            1: { cellWidth: 72 },
                            2: { cellWidth: 30, halign: 'right' },
                            3: { cellWidth: 32 },
                            4: { cellWidth: 35 }
                        }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(10);
                    doc.setTextColor(120, 120, 120);
                    doc.text('Sin egresos registrados para este método.', 20, currentY);
                    currentY += 10;
                }

                if (index < methodGroups.length - 1) {
                    currentY = ensureSpaceFor(doc, currentY, 30);
                    doc.setDrawColor(220, 220, 220);
                    doc.setLineWidth(0.2);
                    doc.line(15, currentY, pageW - 15, currentY);
                    currentY += 8;
                }
            });

            const today = new Date().toLocaleDateString('es-VE');
            const totalPages = doc.getNumberOfPages();
            for (let page = 1; page <= totalPages; page += 1) {
                doc.setPage(page);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(120, 120, 120);
                doc.text(`${companyName} - ${today}`, pageW / 2, pageH - 8, { align: 'center' });
            }

            const fileName = `Balance_Flujo_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating CashFlow PDF:', error);
            alert('No se pudo generar el PDF. Intenta nuevamente.');
        } finally {
            setGenerating(false);
        }
    };

    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <FileText className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Reporte PDF de Balance</h3>
                            <p className="text-sm text-slate-500">
                                Agrupa movimientos por método de pago en el rango seleccionado
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        disabled={generating}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 text-sm text-slate-600">
                    <p>
                        El documento incluirá tablas independientes por método de pago para ingresos y egresos,
                        manteniendo las mismas columnas mostradas en pantalla.
                    </p>
                    {dateRangeLabel && (
                        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm">
                            <span className="font-semibold">Período:</span> {dateRangeLabel}
                        </div>
                    )}
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Logo de la empresa y encabezado corporativo.</li>
                        <li>Tablas por método con totales exactos.</li>
                        <li>Mensajes cuando no existan registros para un método.</li>
                        <li>Pie de página con información de la empresa.</li>
                    </ul>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={generating}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Generar PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

export default CashFlowReportPDF;
