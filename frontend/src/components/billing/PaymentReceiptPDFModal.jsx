import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import { useSettings } from '../../context/SettingsContext';
import { getCurrencySymbol } from '../../utils/currency';

const DEFAULT_LOGO = '/1.png';
const DEFAULT_COMPANY_NAME = 'Import Services';
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
 * Modal para generar y previsualizar el recibo de pago PDF
 * Solo aplica para pagos con método CASH_USD (Efectivo USD)
 */
const PaymentReceiptPDFModal = ({ isOpen, onClose, payment, clientName, receivableNumber, currency = 'USD' }) => {
    const [generating, setGenerating] = useState(false);
    const { settings: companySettings } = useSettings();
    const currencySymbol = getCurrencySymbol(currency);

    if (!isOpen || !payment) return null;

    const logoUrl = companySettings?.logoUrl || DEFAULT_LOGO;
    const companyName = companySettings?.companyName || DEFAULT_COMPANY_NAME;
    const companyRif = companySettings?.rif || '';
    const primaryColor = companySettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const primaryRgb = hexToRgb(primaryColor);
    const receiptBgUrl = companySettings?.receiptBgUrl || null;

    const paymentAmount = parseFloat(payment.amount) || 0;
    const paymentDate = new Date(payment.date || payment.createdAt);
    const formattedDate = paymentDate.toLocaleDateString('es-VE', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // ── Generar PDF ──
    const generatePDF = async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'letter');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 25;
            const contentWidth = pageWidth - margin * 2;
            let y = margin;

            // ── Fondo personalizado ──
            if (receiptBgUrl) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    const bgFullUrl = receiptBgUrl.startsWith('http') ? receiptBgUrl : `${API_BASE}${receiptBgUrl}`;
                    const bgImg = new Image();
                    bgImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        bgImg.onload = resolve;
                        bgImg.onerror = reject;
                        bgImg.src = bgFullUrl;
                    });
                    const bgJpeg = await imageToJpegDataUrl(bgImg, { maxWidth: 1600, maxHeight: 1600, quality: 0.65 });
                    doc.addImage(bgJpeg, 'JPEG', 0, 0, pageWidth, pageHeight);
                } catch (e) {
                    console.warn('No se pudo cargar el fondo del recibo:', e);
                }
            }

            // ── Logo ──
            try {
                const logoImg = new Image();
                logoImg.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = reject;
                    logoImg.src = logoUrl;
                });
                const logoPng = await resizePngDataUrl(logoImg, { maxWidth: 650, maxHeight: 300 });
                const logoH = 18;
                const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                const logoW = logoH * ratio;
                const logoX = (pageWidth - logoW) / 2;
                doc.addImage(logoPng, 'PNG', logoX, y, logoW, logoH);
                y += logoH + 5;
            } catch {
                y += 5;
            }

            //RIF
            if (companyRif) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(`RIF: ${companyRif}`, pageWidth / 2, y, { align: 'center' });
                y += 5;
            }

            // ── Línea decorativa ──
            y += 3;
            doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
            doc.setLineWidth(0.8);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;

            // ── Título: RECIBO DE PAGO ──
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
            doc.text('RECIBO DE PAGO', pageWidth / 2, y, { align: 'center' });
            y += 12;

            // ── Fecha y lugar ──
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            doc.text(`Valencia, ${formattedDate}`, margin, y);
            y += 12;

            // ── Cuerpo del recibo ──
            const amountFormatted = paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);

            // Párrafo principal con fuente mixta (normal y bold)
            const lineHeight = 7;
            const texts = [
                { text: 'Nosotros ', style: 'normal' },
                { text: companyName, style: 'bold' },
                { text: `, RIF: ${companyRif}, hacemos constar que hemos recibido conforme de `, style: 'normal' },
                { text: clientName || 'N/A', style: 'bold' },
                { text: `, la cantidad de `, style: 'normal' },
                { text: `${currencySymbol}${amountFormatted}.`, style: 'bold' }
            ];

            // Renderizar texto con fragmentos mixtos bold/normal usando splitTextToSize
            let fullText = texts.map(t => t.text).join('');
            // Usamos splitTextToSize para párrafo envuelto
            doc.setFont('helvetica', 'normal');
            const wrappedLines = doc.splitTextToSize(fullText, contentWidth);
            
            for (const line of wrappedLines) {
                doc.text(line, margin, y);
                y += lineHeight;
            }

            y += 15;

            // ── Línea de firma: Recibido por ──
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text('Recibido por: ___________________________________________', margin, y);
            y += 12;

            // ── Línea de C.I. ──
            doc.text('C.I.: ___________________________________________________', margin, y);
            y += 20;

            // ── Zona de notas adicionales ──
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text('Notas adicionales:', margin, y);
            y += 5;
            doc.setDrawColor(200, 200, 200);
            for (let i = 0; i < 4; i++) {
                doc.line(margin, y, pageWidth - margin, y);
                y += 8;
            }

            // ── Footer con línea decorativa ──
            const footerY = pageHeight - 20;
            doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
            doc.setLineWidth(0.5);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text('Este recibo es un comprobante de pago en efectivo USD.', pageWidth / 2, footerY + 5, { align: 'center' });

            // ── Guardar ──
            const receiptNum = payment.receipt?.receiptNumber || 'S-N';
            doc.save(`Recibo_Pago_${receiptNum}_${clientName?.replace(/[^a-zA-Z0-9]/g, '_') || 'cliente'}.pdf`);

        } catch (error) {
            console.error('Error generando PDF:', error);
        } finally {
            setGenerating(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-xl">
                            <Printer className="text-green-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Recibo de Pago</h3>
                            <p className="text-xs text-slate-500">Efectivo {currency} — {currencySymbol}{paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body — Resumen del recibo */}
                <div className="p-6 space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Cliente</span>
                            <span className="font-semibold text-slate-800">{clientName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Monto</span>
                            <span className="font-bold text-green-600">{currencySymbol}{paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Fecha</span>
                            <span className="text-slate-700">{formattedDate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Método</span>
                            <span className="text-slate-700">Efectivo USD</span>
                        </div>
                        {payment.reference && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Referencia</span>
                                <span className="text-slate-700 font-mono text-xs">{payment.reference}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                        Se generará un PDF con el formato de recibo oficial de la empresa.
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                        Cancelar
                    </button>
                    <button onClick={generatePDF} disabled={generating}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {generating
                            ? <><Loader2 className="animate-spin" size={18} /> Generando...</>
                            : <><Download size={18} /> Descargar PDF</>
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PaymentReceiptPDFModal;
