import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, ScrollText, Eye, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../context/SettingsContext';
import axios from 'axios';
import { buildPortLookup, replaceRouteCodesWithNames } from '../../utils/locationFormatters';

const DEFAULT_LOGO = '';
const DEFAULT_COMPANY_NAME = 'ERP Logística';
const DEFAULT_COMPANY_SLOGAN = 'Soluciones logísticas integrales';
const DEFAULT_PRIMARY_COLOR = '#003366';
const DELIVERY_NOTE_DISCLAIMER = ' UNA VEZ ENTREGADA LA MERCANCIA, YA SEA EN GALPON O POR PARTE DEL TRANSPORTE, QUEDA A RESPONSABILIDAD DEL CLIENTE. USO, MANIPULACION, Y TRASLADO DE LA MISMA';

const hexToRgb = (hex) => {
    const num = parseInt(hex.replace('#', ''), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const imageToJpegDataUrl = async (img, { maxWidth, maxHeight, quality = 0.7 } = {}) => {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    const scaleW = maxWidth ? (maxWidth / srcW) : 1;
    const scaleH = maxHeight ? (maxHeight / srcH) : 1;
    const scale = Math.min(scaleW, scaleH, 1);

    const outW = Math.max(1, Math.floor(srcW * scale));
    const outH = Math.max(1, Math.floor(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, outW, outH);

    return canvas.toDataURL('image/jpeg', quality);
};

const resizePngDataUrl = async (img, { maxWidth, maxHeight } = {}) => {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    const scaleW = maxWidth ? (maxWidth / srcW) : 1;
    const scaleH = maxHeight ? (maxHeight / srcH) : 1;
    const scale = Math.min(scaleW, scaleH, 1);

    const outW = Math.max(1, Math.floor(srcW * scale));
    const outH = Math.max(1, Math.floor(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, outW, outH);

    return canvas.toDataURL('image/png');
};

/**
 * Modal para vista previa y generación de PDF de nota de entrega
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DeliveryNotePDFModal = ({ isOpen, onClose, note }) => {
    const [generating, setGenerating] = useState(false);
    const [showNotes, setShowNotes] = useState(true);
    const [portCatalog, setPortCatalog] = useState([]);
    const { settings: companySettings, loading: loadingSettings } = useSettings();
    const portLookup = useMemo(() => buildPortLookup(portCatalog), [portCatalog]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchPorts = async () => {
            try {
                const res = await axios.get(`${API_URL}/ports?all=true`, { withCredentials: true });
                setPortCatalog(res.data.data || res.data || []);
            } catch (error) {
                console.error('Error loading ports for DeliveryNote PDF:', error);
            }
        };
        fetchPorts();
    }, [isOpen]);

    if (!isOpen || !note) return null;
    if (typeof document === 'undefined') return null;

    // Valores de configuración
    const logoUrl = companySettings?.logoUrl || DEFAULT_LOGO;
    const primaryColor = companySettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const primaryRgb = hexToRgb(primaryColor);
    const deliveryNoteBgUrl = companySettings?.deliveryNoteBgUrl || null;

    // Datos de la nota
    const noteNumber = `NDE-${String(note.number).padStart(5, '0')}`;
    const noteDate = new Date(note.date || note.createdAt).toLocaleDateString('es-VE');
    const items = (note.items || []).map(item => ({
        description: replaceRouteCodesWithNames(item.description || 'Item', portLookup),
        allyCode: item.ally?.internalCode || '-',
        quantity: Number(item.quantity) || 0,
        weight: item.weight != null ? Number(item.weight) : null,
		cbm: item.cbm != null ? Number(item.cbm) : null
    }));

    const generatePDF = async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = 20;

            // ── Fondo personalizado ──
            if (deliveryNoteBgUrl) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    const bgImg = new window.Image();
                    bgImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        bgImg.onload = resolve;
                        bgImg.onerror = reject;
                        bgImg.src = deliveryNoteBgUrl.startsWith('http') ? deliveryNoteBgUrl : `${API_BASE}${deliveryNoteBgUrl}`;
                    });

                    const bgJpeg = await imageToJpegDataUrl(bgImg, { maxWidth: 1600, maxHeight: 1600, quality: 0.65 });
                    doc.addImage(bgJpeg, 'JPEG', 0, 0, pageWidth, pageHeight);
                } catch (err) {
                    console.warn('No se pudo cargar el fondo del PDF:', err);
                }
            }

            // ── Logo ──
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = logoUrl;
            });
            const logoWidth = 50;
            const logoHeight = 13.5;
            const logoPng = await resizePngDataUrl(img, { maxWidth: 650, maxHeight: 300 });
            doc.addImage(logoPng, 'PNG', margin, yPos, logoWidth, logoHeight);

            // ── Título ──
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('NOTA DE ENTREGA', pageWidth - margin, yPos + 8, { align: 'right' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(noteNumber, pageWidth - margin, yPos + 16, { align: 'right' });

            yPos += 30;

            // Línea separadora
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;

            const sectionStartY = yPos;
            const columnGap = 12;
            const columnWidth = (pageWidth - 2 * margin - columnGap) / 2;
            const leftColumnX = margin;
            const rightColumnX = margin + columnWidth + columnGap;

            // ── Columna izquierda: Documento ──
            let leftY = sectionStartY;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('DETALLE DE ENTREGA', leftColumnX, leftY);
            leftY += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Fecha: ${noteDate}`, leftColumnX, leftY);
            leftY += 4;

			doc.text(`Warehouse: ${note.warehouseNumber || 'N/A'}`, leftColumnX, leftY);
			leftY += 4;

            if (note.quote) {
                doc.text(`Cotizacion origen: COT-${String(note.quote.number).padStart(5, '0')}`, leftColumnX, leftY);
                leftY += 4;
            }

            if (note.deliveredTo) {
                doc.text(`Recibido por: ${note.deliveredTo}`, leftColumnX, leftY);
                leftY += 4;
            }

            if (note.contactPhone) {
                doc.text(`Teléfono contacto: ${note.contactPhone}`, leftColumnX, leftY);
                leftY += 4;
            }

            if (note.deliveryAddress) {
                const addressLines = doc.splitTextToSize(`Dir. entrega: ${note.deliveryAddress}`, columnWidth);
                doc.text(addressLines, leftColumnX, leftY);
                leftY += addressLines.length * 4;
            }

            const documentEndY = leftY;

            // ── Columna derecha: Cliente (solo nombre) ──
            let rightY = sectionStartY;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('CLIENTE', rightColumnX, rightY);
            rightY += 6;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(10);
            doc.text(note.client?.name || 'N/A', rightColumnX, rightY);
            rightY += 5;

            yPos = Math.max(documentEndY, rightY) + 10;

            // ── Tabla de items ──
            const tableData = items.map((item, i) => [
                i + 1,
                item.description,
                item.quantity,
				item.weight != null ? `${item.weight.toFixed(2)} KG` : '—',
				item.cbm != null ? item.cbm.toFixed(3) : '—'
            ]);

            autoTable(doc, {
                startY: yPos,
				head: [['#', 'Descripción', 'Cant.', 'Peso', 'CBM']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 35, halign: 'center' },
                    4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
                },
                margin: { left: margin, right: margin }
            });

            yPos = doc.lastAutoTable.finalY + 10;

			yPos += 10;

            // ── Notas (respeta el toggle) ──
            if (showNotes && note.notes) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 51, 51);
                doc.text('NOTAS', margin, yPos);
                yPos += 6;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                const splitNotes = doc.splitTextToSize(note.notes, pageWidth - 2 * margin);
                doc.text(splitNotes, margin, yPos);
            }

            // ── Sección de firmas ──
            const firmaY = pageHeight - 45;
            doc.setDrawColor(180, 180, 180);
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');

            // Firma izquierda: Entregado por
            doc.line(margin, firmaY, margin + 65, firmaY);
            doc.text('Entregado por', margin + 15, firmaY + 5);

            // Firma derecha: Recibido por
            doc.line(pageWidth - margin - 65, firmaY, pageWidth - margin, firmaY);
            doc.text('Recibido por', pageWidth - margin - 50, firmaY + 5);

            // ── Footer ──
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            const disclaimerLines = doc.splitTextToSize(DELIVERY_NOTE_DISCLAIMER, pageWidth - 2 * margin);
            doc.text(disclaimerLines, pageWidth / 2, pageHeight - 10, { align: 'center' });

            const blob = doc.output('blob');
            const blobUrl = URL.createObjectURL(blob);

            const newTab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
            if (!newTab) {
                doc.save(`nota_entrega_${noteNumber.replace('-', '_')}.pdf`);
            }

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 60_000);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setGenerating(false);
        }
    };

    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

    return createPortal((
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ScrollText className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Vista Previa del PDF</h2>
                            <p className="text-sm text-slate-500">Nota de Entrega — {noteNumber}</p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loadingSettings ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-8 max-w-2xl mx-auto relative overflow-hidden">
                            {/* Fondo preview (si existe) */}
                            {deliveryNoteBgUrl && (
                                <img
                                    src={deliveryNoteBgUrl.startsWith('http') ? deliveryNoteBgUrl : `${API_BASE}${deliveryNoteBgUrl}`}
                                    alt="Fondo"
                                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                                />
                            )}

                            <div className="relative z-10">
                                {/* Header del documento */}
                                <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
                                    <img src={logoUrl} alt="Logo" className="h-12" />
                                    <div className="text-right">
                                        <h1 className="text-2xl font-bold text-slate-800">NOTA DE ENTREGA</h1>
                                        <p className="text-slate-500">{noteNumber}</p>
                                    </div>
                                </div>

                                {/* Info cliente y documento */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-1">Detalle de entrega</p>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <p>Fecha: {noteDate}</p>
									<p>Nro. Warehouse: {note.warehouseNumber || 'N/A'}</p>
                                            {note.quote && (
                                                <p>Origen: COT-{String(note.quote.number).padStart(5, '0')}</p>
                                            )}
                                            {note.deliveredTo && (
                                                <p>Recibido por: {note.deliveredTo}</p>
                                            )}
                                            {note.contactPhone && (
                                                <p>Teléfono contacto: {note.contactPhone}</p>
                                            )}
                                            {note.deliveryAddress && (
                                                <p className="break-words whitespace-pre-wrap max-w-xs">
                                                    Dirección de Entrega: {note.deliveryAddress}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cliente</p>
                                        <p className="font-semibold text-slate-800 text-lg">{note.client?.name || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Tabla de items */}
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="py-2 px-3 text-left font-medium">#</th>
                                            <th className="py-2 px-3 text-left font-medium">Descripción</th>
                                            <th className="py-2 px-3 text-center font-medium">Cant.</th>
											<th className="py-2 px-3 text-right font-medium">Peso</th>
											<th className="py-2 px-3 text-right font-medium">CBM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index} className="border-b border-slate-200">
                                                <td className="py-2 px-3 text-center">{index + 1}</td>
                                                <td className="py-2 px-3">{item.description}</td>
                                                <td className="py-2 px-3 text-center">{item.quantity}</td>
											<td className="py-2 px-3 text-right">{item.weight != null ? `${item.weight.toFixed(2)} KG` : '—'}</td>
											<td className="py-2 px-3 text-right font-semibold">{item.cbm != null ? item.cbm.toFixed(3) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Notas — con toggle */}
                                {note.notes && (
                                    <div className={`rounded-lg p-4 border transition-opacity ${
                                        showNotes
                                            ? 'bg-amber-50 border-amber-100 opacity-100'
                                            : 'bg-slate-50 border-slate-200 opacity-40'
                                    }`}>
                                        <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                                            {showNotes ? <Eye size={11} /> : <EyeOff size={11} />}
                                            NOTAS {!showNotes && <span className="text-slate-400">(No se incluirán en el PDF)</span>}
                                        </p>
                                        <p className="text-sm text-amber-900">{note.notes}</p>
                                    </div>
                                )}

                                {/* Firmas preview */}
                                <div className="mt-10 pt-4 flex justify-between px-6">
                                    <div className="text-center">
                                        <div className="w-40 border-t border-slate-300 mb-1"></div>
                                        <p className="text-xs text-slate-400">Entregado por</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-40 border-t border-slate-300 mb-1"></div>
                                        <p className="text-xs text-slate-400">Recibido por</p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">{DELIVERY_NOTE_DISCLAIMER}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer con botón */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    
                    {/* Toggle notas — solo visible si hay notas */}
                    {note.notes && (
                        <button
                            onClick={() => setShowNotes(prev => !prev)}
                            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                showNotes
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                            title={showNotes ? 'Ocultar notas en el PDF' : 'Mostrar notas en el PDF'}
                        >
                            {showNotes ? <Eye size={14} /> : <EyeOff size={14} />}
                            {showNotes ? 'Notas: visibles' : 'Notas: ocultas'}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={generatePDF}
                        disabled={generating || items.length === 0 || loadingSettings}
                        className="bg-primary-dark hover:bg-primary text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Generando...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Abrir PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    ), document.body);
};

export default DeliveryNotePDFModal;
