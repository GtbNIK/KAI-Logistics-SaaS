import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, Receipt, Eye, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../context/SettingsContext';

const DEFAULT_LOGO = '/1.png';
const DEFAULT_COMPANY_NAME = 'ERP Logística';
const DEFAULT_COMPANY_SLOGAN = 'Soluciones logísticas integrales';
const DEFAULT_PRIMARY_COLOR = '#003366';

const hexToRgb = (hex) => {
    const num = parseInt(hex.replace('#', ''), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const getJsPdfImageFormatFromUrl = (url) => {
    if (!url) return null;

    const cleanUrl = String(url).split('?')[0].split('#')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase();

    if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
    if (ext === 'png') return 'PNG';
    if (ext === 'webp') return 'WEBP';
    return null;
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
 * Modal para vista previa y generación de PDF de aviso de cobro
 */
const PaymentNoticePDFModal = ({ isOpen, onClose, notice }) => {
    const [generating, setGenerating] = useState(false);
    const [showNotes, setShowNotes] = useState(true);
    const { settings: companySettings, loading: loadingSettings } = useSettings();

    if (!isOpen || !notice) return null;
    if (typeof document === 'undefined') return null;

    // Valores de configuración
    const logoUrl = companySettings?.logoUrl || DEFAULT_LOGO;
    const companyName = companySettings?.companyName || DEFAULT_COMPANY_NAME;
    const companySlogan = companySettings?.footerText || DEFAULT_COMPANY_SLOGAN;
    const primaryColor = companySettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const primaryRgb = hexToRgb(primaryColor);
    const noticeBgUrl = companySettings?.noticeBgUrl || null;
    const companyRif = companySettings?.rif || '';
    const paymentInfo = companySettings?.paymentInfo || '';

    // Parsear items de la descripción enriquecida (con aliado usando código interno)
    const parseItems = () => {
        return (notice.items || []).map(item => {
            const parts = (item.description || '').split(' · ');
            const serviceName = parts[0] || 'Servicio';

            // Extraer aliado, ruta o zona según el tipo de servicio
            const allyPart = parts.find(p => p.startsWith('Aliado:'));
            const rutaPart = parts.find(p => p.startsWith('Ruta:'));
            const zonaPart = parts.find(p => p.startsWith('Zona:'));

            const allyCode = allyPart ? allyPart.replace('Aliado: ', '').trim() : '-';
            const allyName = item.ally?.name || '-';
            let destination = '-';
            if (rutaPart) {
                // Reemplazar → por -> (jsPDF no soporta Unicode con helvetica)
                destination = rutaPart.replace('Ruta: ', '').trim().replace('→', '->');
            } else if (zonaPart) {
                destination = zonaPart.replace('Zona: ', '').trim();
            }

            return {
                service: serviceName,
                allyCode,
                allyName,
                destination,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                totalPrice: Number(item.totalPrice) || 0
            };
        });
    };

    const noticeNumber = `AVC-${String(notice.number).padStart(5, '0')}`;
    const issueDate = new Date(notice.issueDate || notice.createdAt).toLocaleDateString('es-VE');
    const items = parseItems();
    const total = Number(notice.totalAmount) || 0;

    const generatePDF = async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = 20;

            // ── Fondo personalizado ──
            if (noticeBgUrl) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    const bgImg = new window.Image();
                    bgImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        bgImg.onload = resolve;
                        bgImg.onerror = reject;
                        bgImg.src = `${API_BASE}${noticeBgUrl}`;
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
            doc.text('AVISO DE COBRO', pageWidth - margin, yPos + 8, { align: 'right' });

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(noticeNumber, pageWidth - margin, yPos + 16, { align: 'right' });

            yPos += 30;

            // Línea separadora
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;

            const sectionStartY = yPos;

            // ── Columna izquierda: Cliente ──
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('CLIENTE', margin, yPos);
            yPos += 6;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(10);
            doc.text(notice.client?.name || 'N/A', margin, yPos);
            yPos += 5;

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            if (notice.client?.rifOrId) {
                doc.text(`RIF/Cédula: ${notice.client.rifOrId}`, margin, yPos);
                yPos += 4;
            }
            if (notice.client?.contactPerson) {
                doc.text(`Contacto: ${notice.client.contactPerson}`, margin, yPos);
                yPos += 4;
            }
            if (notice.client?.phone) {
                doc.text(`Teléfono: ${notice.client.phone}`, margin, yPos);
                yPos += 4;
            }
            if (notice.client?.email) {
                doc.text(`Email: ${notice.client.email}`, margin, yPos);
                yPos += 4;
            }
            const clientEndY = yPos;

            // ── Columna derecha: Documento ──
            let rightY = sectionStartY;
            const rightX = pageWidth / 2 + 10;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('DOCUMENTO', rightX, rightY);
            rightY += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Fecha de emisión: ${issueDate}`, rightX, rightY);
            rightY += 4;

            if (notice.quote) {
                doc.text(`Cotización origen: COT-${String(notice.quote.number).padStart(5, '0')}`, rightX, rightY);
                rightY += 4;
            }

            if (companyRif) {
                doc.text(`RIF Empresa: ${companyRif}`, rightX, rightY);
                rightY += 4;
            }

            // Estado de cobro
            const status = notice.receivable?.status;
            const statusLabels = { PENDING: 'Pendiente', PARTIALLY_PAID: 'Parcialmente Pagado', PAID: 'Pagado' };
            doc.text(`Estado: ${statusLabels[status] || 'Pendiente'}`, rightX, rightY);
            rightY += 4;

            yPos = Math.max(clientEndY, rightY) + 10;

            // ── Tabla de servicios ──
            const tableData = items.map((item, i) => [
                i + 1,
                item.service,
                item.allyCode,
                item.destination,
                item.quantity,
                `$${item.unitPrice.toFixed(2)}`,
                `$${item.totalPrice.toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['#', 'Servicio', 'Aliado', 'Ruta / Zona', 'Cant.', 'P. Unit.', 'Total']],
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
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 22, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: margin, right: margin }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // ── Total ──
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(pageWidth - margin - 60, yPos, 60, 20, 3, 3, 'F');
            doc.setFontSize(10);
            doc.setTextColor(255);
            doc.text('TOTAL', pageWidth - margin - 55, yPos + 8);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });

            yPos += 35;

            // ── Información de Pago (dinámica desde configuración) ──
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('INFORMACIÓN DE PAGO', margin, yPos);
            yPos += 7;

            if (paymentInfo) {
                // Renderizar cada línea del texto configurado
                const paymentLines = paymentInfo.split('\n').filter(l => l.trim());
                const rectHeight = Math.max(20, paymentLines.length * 5 + 10);

                doc.setFillColor(245, 248, 255);
                doc.roundedRect(margin, yPos, pageWidth - 2 * margin, rectHeight, 3, 3, 'F');
                doc.setDrawColor(200, 210, 230);
                doc.roundedRect(margin, yPos, pageWidth - 2 * margin, rectHeight, 3, 3, 'S');

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                paymentLines.forEach((line, idx) => {
                    doc.text(line, margin + 5, yPos + 7 + idx * 5);
                });

                yPos += rectHeight + 10;
            } else {
                // Fallback si no hay info configurada
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('Configure los datos bancarios en Configuración → Datos Bancarios.', margin, yPos + 4);
                yPos += 15;
            }

            // ── Notas (respeta el toggle) ──
            if (showNotes && notice.notes) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 51, 51);
                doc.text('NOTAS', margin, yPos);
                yPos += 6;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                const splitNotes = doc.splitTextToSize(notice.notes, pageWidth - 2 * margin);
                doc.text(splitNotes, margin, yPos);
            }

            // ── Footer ──
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `${companyName} - ${companySlogan}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );

            const blob = doc.output('blob');
            const blobUrl = URL.createObjectURL(blob);

            const newTab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
            if (!newTab) {
                doc.save(`aviso_cobro_${noticeNumber.replace('-', '_')}.pdf`);
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
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Receipt className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Vista Previa del PDF</h2>
                            <p className="text-sm text-slate-500">Aviso de Cobro — {noticeNumber}</p>
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
                            {noticeBgUrl && (
                                <img
                                    src={`${API_BASE}${noticeBgUrl}`}
                                    alt="Fondo"
                                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                                />
                            )}

                            <div className="relative z-10">
                                {/* Header del documento */}
                                <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
                                    <img src={logoUrl} alt="Logo" className="h-12" />
                                    <div className="text-right">
                                        <h1 className="text-2xl font-bold text-slate-800">AVISO DE COBRO</h1>
                                        <p className="text-slate-500">{noticeNumber}</p>
                                    </div>
                                </div>

                                {/* Info cliente y documento */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cliente</p>
                                        <p className="font-semibold text-slate-800 mb-2">{notice.client?.name || 'N/A'}</p>
                                        <div className="space-y-1">
                                            {notice.client?.rifOrId && (
                                                <p className="text-xs text-slate-600">RIF: {notice.client.rifOrId}</p>
                                            )}
                                            {notice.client?.contactPerson && (
                                                <p className="text-xs text-slate-600">Contacto: {notice.client.contactPerson}</p>
                                            )}
                                            {notice.client?.phone && (
                                                <p className="text-xs text-slate-600">Tel: {notice.client.phone}</p>
                                            )}
                                            {notice.client?.email && (
                                                <p className="text-xs text-slate-600">Email: {notice.client.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Fecha: {issueDate}</p>
                                        {notice.quote && (
                                            <p className="text-xs text-slate-500">
                                                Origen: COT-{String(notice.quote.number).padStart(5, '0')}
                                            </p>
                                        )}
                                        {companyRif && (
                                            <p className="text-xs text-slate-500">RIF Empresa: {companyRif}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tabla de items */}
                                <table className="w-full mb-6 text-sm">
                                    <thead>
                                        <tr style={{ backgroundColor: primaryColor }} className="text-white">
                                            <th className="py-2 px-3 text-left font-medium">#</th>
                                            <th className="py-2 px-3 text-left font-medium">Servicio</th>
                                            <th className="py-2 px-3 text-left font-medium">Aliado</th>
                                            <th className="py-2 px-3 text-left font-medium">Ruta / Zona</th>
                                            <th className="py-2 px-3 text-center font-medium">Cant.</th>
                                            <th className="py-2 px-3 text-right font-medium">P. Unit.</th>
                                            <th className="py-2 px-3 text-right font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                                <td className="py-2 px-3 text-center">{index + 1}</td>
                                                <td className="py-2 px-3">{item.service}</td>
                                                <td className="py-2 px-3">{item.allyCode}</td>
                                                <td className="py-2 px-3">{item.destination}</td>
                                                <td className="py-2 px-3 text-center">{item.quantity}</td>
                                                <td className="py-2 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                                                <td className="py-2 px-3 text-right font-semibold">${item.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Total */}
                                <div className="flex justify-end mb-6">
                                    <div className="bg-slate-800 text-white px-6 py-3 rounded-lg">
                                        <span className="text-slate-300 text-sm mr-4">TOTAL</span>
                                        <span className="text-xl font-bold">${total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Información de Pago — dinámica */}
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                                    <p className="text-xs font-bold text-blue-800 mb-2">INFORMACIÓN DE PAGO</p>
                                    {paymentInfo ? (
                                        paymentInfo.split('\n').map((line, i) => (
                                            line.trim() && (
                                                <p key={i} className="text-xs text-blue-700">{line}</p>
                                            )
                                        ))
                                    ) : (
                                        <p className="text-xs text-blue-400 italic">
                                            Configure los datos bancarios en Configuración → Datos Bancarios.
                                        </p>
                                    )}
                                </div>

                                {/* Notas — con toggle */}
                                {notice.notes && (
                                    <div className={`rounded-lg p-4 border transition-opacity ${
                                        showNotes
                                            ? 'bg-amber-50 border-amber-100 opacity-100'
                                            : 'bg-slate-50 border-slate-200 opacity-40'
                                    }`}>
                                        <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                                            {showNotes ? <Eye size={11} /> : <EyeOff size={11} />}
                                            NOTAS {!showNotes && <span className="text-slate-400">(No se incluirán en el PDF)</span>}
                                        </p>
                                        <p className="text-sm text-amber-900">{notice.notes}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                                    <p className="text-xs text-slate-400">{companyName} - {companySlogan}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer con botón */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    
                    {/* Toggle notas — solo visible si hay notas */}
                    {notice.notes && (
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
                                Imprimir PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    ), document.body);
};

export default PaymentNoticePDFModal;
