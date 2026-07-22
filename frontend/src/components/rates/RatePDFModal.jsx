import { useState, useEffect, useMemo } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../context/SettingsContext';
import { buildPortLookup, formatPortList } from '../../utils/locationFormatters';
import { dateToStringHelper } from '../../utils/dateHelpers';
import { resizePngDataUrl } from '../../utils/imageHelpers';
import api from '../../lib/api';
import { DEFAULT_LOGO, DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_RIF, DEFAULT_PRIMARY_COLOR } from '../../config/companyDefaults';

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 51, b: 102 };
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

const loadImageAsDataUrl = async (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            try {
                const dataUrl = await imageToJpegDataUrl(img, { maxWidth: 2480, maxHeight: 3508, quality: 0.7 });
                resolve(dataUrl);
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};

// Carga PNG preservando transparencia
const loadImageAsPngDataUrl = async (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
            try {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};

const formatValidityRange = (from, until) => `${dateToStringHelper(from)} - ${dateToStringHelper(until)}`;

const RatePDFModal = ({ isOpen, onClose, rates, region, observations = '' }) => {
    const { settings } = useSettings();
    const [generating, setGenerating] = useState(false);
    const [portCatalog, setPortCatalog] = useState([]);

    const portLookup = useMemo(() => buildPortLookup(portCatalog), [portCatalog]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchPorts = async () => {
            try {
                const res = await api.get('/ports?all=true');
                setPortCatalog(res.data.data || res.data || []);
            } catch (error) {
                console.error('Error loading ports for Rate PDF:', error);
            }
        };
        fetchPorts();

        const handleTenantChange = () => fetchPorts();
        window.addEventListener('kai:tenant-changed', handleTenantChange);
        return () => window.removeEventListener('kai:tenant-changed', handleTenantChange);
    }, [isOpen]);

    if (!isOpen) return null;

    const companyName = settings?.companyName || DEFAULT_COMPANY_NAME;
    const companyRif = settings?.rif || settings?.companyRif || DEFAULT_COMPANY_RIF;
    const logoUrl = settings?.logoUrl || DEFAULT_LOGO;
    const primaryColor = settings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const rateBgUrl = settings?.rateBgUrl;

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const rgb = hexToRgb(primaryColor);

            // Fondo
            if (rateBgUrl) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    const fullBgUrl = rateBgUrl.startsWith('http') ? rateBgUrl : `${API_BASE}${rateBgUrl}`;
                    const bgDataUrl = await loadImageAsDataUrl(fullBgUrl);
                    doc.addImage(bgDataUrl, 'JPEG', 0, 0, pageW, pageH);
                } catch (error) {
                    console.warn('Error loading background:', error);
                }
            }

            // Logo (usar PNG para mantener transparencia) con tamaño dinámico
            try {
                const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                const fullLogoUrl = logoUrl.startsWith('http')
                    ? logoUrl
                    : (logoUrl.startsWith('/')
                        ? (typeof window !== 'undefined' ? `${window.location.origin}${logoUrl}` : logoUrl)
                        : `${API_BASE}/${logoUrl.replace(/^\//, '')}`);
                const img = await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.crossOrigin = 'anonymous';
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = fullLogoUrl;
                });
                const logoPng = await resizePngDataUrl(img, { maxWidth: 650, maxHeight: 300 });
                const logoWidth = 50; // mm
                const aspect = (img.naturalHeight || img.height) / (img.naturalWidth || img.width) || (13.5/50);
                const logoHeight = Math.max(10, Math.min(18, logoWidth * aspect));
                doc.addImage(logoPng, 'PNG', 15, 15, logoWidth, logoHeight);
            } catch (error) {
                console.warn('Error loading logo:', error);
            }

            const regionLabel = region === 'CHINA' ? 'China' : 'Otros Países';

            // Título
            doc.setFontSize(20);
            doc.setTextColor(rgb.r, rgb.g, rgb.b);
            doc.setFont('helvetica', 'bold');
            doc.text(`${regionLabel.toUpperCase()}`, pageW / 2, 25, { align: 'center' });

            // Fecha  (se elimina texto de región)
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            //doc.text(`Región: ${region === 'CHINA' ? 'China' : 'Otros Países'}`, 15, 38);
            doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-VE')}`, pageW - 15, 38, { align: 'right' });

            const formatPriceCell = (value) => {
                const amount = Number(value);
                if (Number.isFinite(amount) && amount > 0) {
                    return `$${amount.toFixed(2)}`;
                }
                return '-';
            };

            // Tabla (dinámica según región)
            const tableConfig = (() => {
                if (region === 'CHINA') {
                    return {
                        head: [['Carrier', 'POL', 'POD', '20HC', '40HC', 'Días Libres', 'Validez']],
                        body: rates.map((rate) => [
                            rate.shippingLine?.code || '-',
                            formatPortList(rate.originPorts, portLookup, { fallback: '-', separator: ' / ' }),
                            formatPortList(rate.destinationPorts, portLookup, { fallback: '-', separator: ' / ' }),
                            formatPriceCell(rate.sale20HC),
                            formatPriceCell(rate.sale40HC),
                            `${rate.freeDays} días`,
                            formatValidityRange(rate.validFrom, rate.validUntil)
                        ]),
                        columnStyles: {
                            0: { cellWidth: 45, halign: 'center' },
                            1: { cellWidth: 45, halign: 'center' },
                            2: { cellWidth: 45, halign: 'center' },
                            3: { cellWidth: 35, halign: 'center' },
                            4: { cellWidth: 35, halign: 'center' },
                            5: { cellWidth: 35, halign: 'center' },
                            6: { cellWidth: 38, halign: 'center' }
                        },
                        totalWidth: 45 + 45 + 45 + 35 + 35 + 35 + 38
                    };
                }

                return {
                    head: [['Carrier', 'País', 'Puertos Origen', 'Puertos Destino', '20HC', '40HC', 'Días Libres', 'Validez']],
                    body: rates.map((rate) => [
                        rate.shippingLine?.code || '-',
                        rate.country?.name || '-',
                        formatPortList(rate.originPorts, portLookup, { fallback: '-', separator: ' / ' }),
                        formatPortList(rate.destinationPorts, portLookup, { fallback: '-', separator: ' / ' }),
                        formatPriceCell(rate.sale20HC),
                        formatPriceCell(rate.sale40HC),
                        `${rate.freeDays} días`,
                        formatValidityRange(rate.validFrom, rate.validUntil)
                    ]),
                    columnStyles: {
                        0: { cellWidth: 45, halign: 'center' },
                        1: { cellWidth: 45 },
                        2: { cellWidth: 45 },
                        3: { cellWidth: 35 },
                        4: { cellWidth: 25, halign: 'center' },
                        5: { cellWidth: 25, halign: 'center' },
                        6: { cellWidth: 25, halign: 'center' },
                        7: { cellWidth: 30, halign: 'center' }
                    },
                    totalWidth: 45 + 45 + 45 + 35 + 25 + 25 + 25 + 30
                };
            })();

            const leftRight = Math.max(10, (pageW - tableConfig.totalWidth) / 2);

            autoTable(doc, {
                startY: 45,
                head: tableConfig.head,
                body: tableConfig.body,
                theme: 'grid',
                headStyles: {
                    fillColor: [rgb.r, rgb.g, rgb.b],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [40, 40, 40]
                },
                columnStyles: tableConfig.columnStyles,
                margin: { left: leftRight, right: leftRight },
            });

            // Segunda página con observaciones (si existen) - solo usa la prop recibida o ajuste en settings
            const obsText = (observations || settings?.rateObservations || '').toString().trim();
            if (obsText.length > 0) {
                doc.addPage('a4', 'landscape');
                // Fondo en segunda página
                if (rateBgUrl) {
                    try {
                        const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                        const fullBgUrl = rateBgUrl.startsWith('http') ? rateBgUrl : `${API_BASE}${rateBgUrl}`;
                        const bgDataUrl = await loadImageAsDataUrl(fullBgUrl);
                        doc.addImage(bgDataUrl, 'JPEG', 0, 0, pageW, pageH);
                    } catch (error) {
                        console.warn('Error loading background (page 2):', error);
                    }
                }
                // Título de observaciones
                doc.setFontSize(18);
                doc.setTextColor(rgb.r, rgb.g, rgb.b);
                doc.setFont('helvetica', 'bold');
                doc.text('Observaciones:', 15, 25);

                // Texto de observaciones con wrap
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(40, 40, 40);
                const maxWidth = pageW - 30;
                const lines = doc.splitTextToSize(obsText, maxWidth);
                doc.text(lines, 15, 40);
            }

            // Descargar
            const fileName = `Tarifas_${regionLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor intenta de nuevo.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <FileText className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Generar PDF de Tarifas</h3>
                            <p className="text-sm text-slate-500">
                                {rates.length} tarifa{rates.length !== 1 ? 's' : ''} de {region === 'CHINA' ? 'China' : 'Otros Países'}
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

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <p className="text-sm text-slate-700">
                            Se generará un PDF con todas las tarifas mostradas en la tabla actual,
                            incluyendo información de  rutas, precios y validez.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700">Contenido del PDF:</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Logo y encabezado de empresa
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Tabla con todas las tarifas
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Información de validez
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Fondo personalizado (si está configurado)
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
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
};

export default RatePDFModal;
