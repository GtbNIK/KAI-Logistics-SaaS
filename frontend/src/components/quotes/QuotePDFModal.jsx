import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, FileText, Truck, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../context/SettingsContext';

// Valores por defecto si no hay configuración
const DEFAULT_LOGO = '/1.png';
const DEFAULT_COMPANY_NAME = 'ERP Logística';
const DEFAULT_COMPANY_SLOGAN = 'Soluciones logísticas integrales';
const DEFAULT_PRIMARY_COLOR = '#003366';

/**
 * Convierte color hex a RGB
 */
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 51, b: 102 };
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

/**
 * Modal para vista previa y generación de PDF de cotización
 */
const QuotePDFModal = ({ 
    isOpen, 
    onClose, 
    quote,      // Datos de la cotización { clientName, items, total, notes, number, date, validUntil }
    services,   // Lista de servicios para obtener nombres
    allies,     // Lista de aliados
    zones       // Lista de zonas
}) => {
    const [generating, setGenerating] = useState(false);
    const { settings: companySettings, loading: loadingSettings } = useSettings();

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    // Obtener valores de configuración o defaults
    const logoUrl = companySettings?.logoUrl || DEFAULT_LOGO;
    const companyName = companySettings?.companyName || DEFAULT_COMPANY_NAME;
    const companySlogan = companySettings?.footerText || DEFAULT_COMPANY_SLOGAN;
    const primaryColor = companySettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const primaryRgb = hexToRgb(primaryColor);
    const quoteBgUrl = companySettings?.quoteBgUrl || null;

    const resolveClientName = () => {
        const c = quote?.client;
        return c?.data?.name || c?.name || c?.label || quote?.clientName || 'Sin seleccionar';
    };

    // Preparar datos para el PDF
    const prepareItems = () => {
        return quote.items.filter(item => item.serviceId).map(item => {
            const service = services.find(s => s.value === item.serviceId);
            const zone = zones.find(z => z.value === item.zoneId);
            const serviceType = service?.data?.type;
            const isPortService = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(serviceType);
            
            // Extraer solo el nombre de la zona (sin el código)
            const zoneName = zone?.label ? zone.label.split(' - ')[1] || zone.label : '-';
            
            const destination = isPortService 
                ? (item.originPort && item.destinationPort ? `${item.originPort} -> ${item.destinationPort}` : '-')
                : zoneName;

            return {
                service: service?.label || 'Servicio',
                destination,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                subtotal: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
            };
        });
    };

    const generatePDF = async () => {
        setGenerating(true);
        
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 25;
            let yPos = 20;

            // Fondo personalizado (si existe)
            if (quoteBgUrl) {
                try {
                    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
                    const bgImg = new window.Image();
                    bgImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        bgImg.onload = resolve;
                        bgImg.onerror = reject;
                        bgImg.src = `${API_BASE}${quoteBgUrl}`;
                    });

                    const bgFormat = getJsPdfImageFormatFromUrl(quoteBgUrl) || 'JPEG';
                    doc.addImage(bgImg, bgFormat, 0, 0, pageWidth, pageHeight);
                } catch (err) {
                    console.warn('No se pudo cargar el fondo del PDF:', err);
                }
            }

            // Cargar logo
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = logoUrl;
            });

            // Logo (arriba a la izquierda)
            // Logo (arriba a la izquierda) - Ajustado tamaño
            // Mantener proporción si es posible, pero aquí forzamos un tamaño razonable
            const logoWidth = 50; 
            const logoHeight = 13.5;
            doc.addImage(img, 'PNG', margin, yPos, logoWidth, logoHeight);


            // Título de la cotización (arriba a la derecha)
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('COTIZACIÓN', pageWidth - margin, yPos + 8, { align: 'right' });
            
            // Número de cotización
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const quoteNumberHeader = quote.number ? `COT-${String(quote.number).padStart(5, '0')}` : 'Nueva Cotización';
            doc.text(quoteNumberHeader, pageWidth - margin, yPos + 16, { align: 'right' });

            yPos += 30;

            // Línea separadora
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;

            // Guardar posición inicial para las dos secciones
            const sectionStartY = yPos;
            
            // ===== COLUMNA IZQUIERDA: INFORMACIÓN DEL CLIENTE =====
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('CLIENTE', margin, yPos);
            yPos += 6;
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(10);
            
            // Nombre del cliente
            const clientName = resolveClientName();
            doc.text(clientName, margin, yPos);
            yPos += 5;
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            
            // Información del cliente en una sola columna (izquierda)
            if (quote.client?.data?.rifOrId) {
                doc.text(`RIF/Cédula: ${quote.client.data.rifOrId}`, margin, yPos);
                yPos += 4;
            }
            
            if (quote.client?.data?.contactPerson) {
                doc.text(`Persona Contacto: ${quote.client.data.contactPerson}`, margin, yPos);
                yPos += 4;
            }
            
            if (quote.client?.data?.phone) {
                doc.text(`Teléfono: ${quote.client.data.phone}`, margin, yPos);
                yPos += 4;
            }
            
            if (quote.client?.data?.email) {
                doc.text(`Email: ${quote.client.data.email}`, margin, yPos);
                yPos += 4;
            }
            
            if (quote.client?.data?.address) {
                const maxLength = 50;
                const address = quote.client.data.address.length > maxLength 
                    ? quote.client.data.address.substring(0, maxLength) + '...'
                    : quote.client.data.address;
                doc.text(`Dirección: ${address}`, margin, yPos);
                yPos += 4;
            }
            
            // Vendedor: usamos el autor de la cotización (Opción A)
            if (quote.user?.name) {
                doc.text(`Vendedor: ${quote.user.name}`, margin, yPos);
                yPos += 4;
            }
            
            const clientSectionEndY = yPos;
            
            // ===== COLUMNA DERECHA: INFORMACIÓN DE LA COTIZACIÓN =====
            let rightColY = sectionStartY;
            const rightColX = pageWidth / 2 + 10;
            
            // Número de cotización
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            rightColY += 8;
            
            // Fechas
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            
            const today = new Date().toLocaleDateString('es-VE');
            const validUntil = quote.validUntil 
                ? new Date(quote.validUntil).toLocaleDateString('es-VE') 
                : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-VE');
            
            doc.text(`Fecha: ${today}`, rightColX, rightColY);
            rightColY += 4;
            doc.text(`Válida hasta: ${validUntil}`, rightColX, rightColY);
            rightColY += 4;
            
            // Ajustar yPos al máximo de ambas secciones
            yPos = Math.max(clientSectionEndY, rightColY) + 10;

            // Tabla de items con color primario dinámico
            const items = prepareItems();
            
            // Detectar si hay servicios Door to Door para cambiar el header
            const hasDoorToDoor = quote.items.some(item => {
                const service = services.find(s => s.value === item.serviceId);
                return service?.data?.type === 'DOOR_TO_DOOR';
            });
            const quantityLabel = hasDoorToDoor ? 'CBM' : 'Cant.';
            
            const tableData = items.map((item, index) => [
                index + 1,
                item.service,
                item.destination,
                item.quantity,
                `$${item.unitPrice.toFixed(2)}`,
                `$${item.subtotal.toFixed(2)}`
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['#', 'Servicio', 'Ruta / Zona', quantityLabel, 'P. Unit.', 'Subtotal']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b], // Color primario dinámico
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [60, 60, 60]
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 22, halign: 'right' },
                    5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: margin, right: margin }
            });

            yPos = doc.lastAutoTable.finalY + 10;

            // Total
            doc.setFillColor(30, 41, 59); // slate-800
            doc.roundedRect(pageWidth - margin - 60, yPos, 60, 20, 3, 3, 'F');
            doc.setFontSize(10);
            doc.setTextColor(255);
            doc.text('TOTAL', pageWidth - margin - 55, yPos + 8);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${(Number(quote.total) || 0).toFixed(2)}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });

            yPos += 35;

            // Notas (solo si showNotesToClient es true)
            if (quote.notes && quote.showNotesToClient !== false) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(51, 51, 51);
                doc.text('NOTAS', margin, yPos);
                yPos += 6;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 80);
                doc.setFontSize(9);
                const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin);
                doc.text(splitNotes, margin, yPos);
            }

            // Footer
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
                doc.save(`cotizacion_${quoteNumberHeader.replace('-', '_')}.pdf`);
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

    const items = prepareItems();

    return createPortal((
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <FileText className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Vista Previa del PDF</h2>
                            <p className="text-sm text-slate-500">Revise antes de imprimir</p>
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
                        /* Simulación del PDF */
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
                            {/* Header del documento */}
                            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
                                <img src={logoUrl} alt="Logo" className="h-12" />
                                <div className="text-right">
                                    <h1 className="text-2xl font-bold text-slate-800">COTIZACIÓN</h1>
                                    <p className="text-slate-500">
                                        {quote.number ? `COT-${String(quote.number).padStart(5, '0')}` : 'Nueva Cotización'}
                                    </p>
                                </div>
                            </div>

                            {/* Info cliente y fechas */}
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Columna izquierda: Cliente */}
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cliente</p>
                                    <p className="font-semibold text-slate-800 mb-2">{resolveClientName()}</p>
                                    
                                    {/* Información del cliente en una sola columna */}
                                    <div className="space-y-1">
                                        {quote.client?.data?.rifOrId && (
                                            <p className="text-xs text-slate-600">RIF/Cédula: {quote.client.data.rifOrId}</p>
                                        )}
                                        {quote.client?.data?.contactPerson && (
                                            <p className="text-xs text-slate-600">Persona Contacto: {quote.client.data.contactPerson}</p>
                                        )}
                                        {quote.client?.data?.phone && (
                                            <p className="text-xs text-slate-600">Teléfono: {quote.client.data.phone}</p>
                                        )}
                                        {quote.client?.data?.email && (
                                            <p className="text-xs text-slate-600">Email: {quote.client.data.email}</p>
                                        )}
                                        {quote.client?.data?.address && (
                                            <p className="text-xs text-slate-600">Dirección: {quote.client.data.address}</p>
                                        )}
                                        {/* Vendedor: autor de la cotización */}
                                        {quote.user?.name && (
                                            <p className="text-xs text-slate-600">Vendedor: {quote.user.name}</p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Columna derecha: Número de cotización y fechas */}
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">
                                        Fecha: {new Date().toLocaleDateString('es-VE')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Válida hasta: {quote.validUntil 
                                            ? new Date(quote.validUntil).toLocaleDateString('es-VE') 
                                            : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-VE')}
                                    </p>
                                </div>
                            </div>

                            {/* Tabla de items con color primario dinámico */}
                            <table className="w-full mb-6 text-sm">
                                <thead>
                                    <tr style={{ backgroundColor: primaryColor }} className="text-white">
                                        <th className="py-2 px-3 text-left font-medium">#</th>
                                        <th className="py-2 px-3 text-left font-medium">Servicio</th>
                                        <th className="py-2 px-3 text-left font-medium">Ruta / Zona</th>
                                        <th className="py-2 px-3 text-center font-medium">Cant.</th>
                                        <th className="py-2 px-3 text-right font-medium">P. Unit.</th>
                                        <th className="py-2 px-3 text-right font-medium">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                            <td className="py-2 px-3 text-center">{index + 1}</td>
                                            <td className="py-2 px-3">{item.service}</td>
                                            <td className="py-2 px-3">{item.destination}</td>
                                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                                            <td className="py-2 px-3 text-right">${(Number(item.unitPrice) || 0).toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right font-semibold">${(Number(item.subtotal) || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Total */}
                            <div className="flex justify-end mb-6">
                                <div className="bg-slate-800 text-white px-6 py-3 rounded-lg">
                                    <span className="text-slate-300 text-sm mr-4">TOTAL</span>
                                    <span className="text-xl font-bold">${(Number(quote.total) || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Notas (solo si showNotesToClient es true) */}
                            {quote.notes && quote.showNotesToClient !== false && (
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                                    <p className="text-xs font-medium text-amber-700 mb-1">NOTAS</p>
                                    <p className="text-sm text-amber-900">{quote.notes}</p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
                                <p className="text-xs text-slate-400">{companyName} - {companySlogan}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer con botón */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={generatePDF}
                        disabled={generating || items.length === 0 || loadingSettings}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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

export default QuotePDFModal;
