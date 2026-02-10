import { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, Truck, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import settingsService from '../../services/settings.service';

// Valores por defecto si no hay configuración
const DEFAULT_LOGO = '/2.png';
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
    const [companySettings, setCompanySettings] = useState(null);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Cargar configuración de la empresa
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const settings = await settingsService.getSettings();
                setCompanySettings(settings);
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoadingSettings(false);
            }
        };
        
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Obtener valores de configuración o defaults
    const logoUrl = companySettings?.logoUrl || DEFAULT_LOGO;
    const companyName = companySettings?.companyName || DEFAULT_COMPANY_NAME;
    const companySlogan = companySettings?.footerText || DEFAULT_COMPANY_SLOGAN;
    const primaryColor = companySettings?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const primaryRgb = hexToRgb(primaryColor);

    // Preparar datos para el PDF
    const prepareItems = () => {
        return quote.items.filter(item => item.serviceId).map(item => {
            const service = services.find(s => s.value === item.serviceId);
            const ally = allies.find(a => a.value === item.allyId);
            const zone = zones.find(z => z.value === item.zoneId);
            const serviceType = service?.data?.type;
            const isPortService = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(serviceType);
            
            const destination = isPortService 
                ? (item.originPort && item.destinationPort ? `${item.originPort} → ${item.destinationPort}` : '-')
                : (zone?.label || '-');

            return {
                service: service?.label || 'Servicio',
                ally: ally?.label || '-',
                destination,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            };
        });
    };

    const generatePDF = async () => {
        setGenerating(true);
        
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = 20;

            // Cargar logo
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = logoUrl;
            });

            // Logo (arriba a la izquierda)
            doc.addImage(img, 'PNG', margin, yPos, 40, 20);

            // Título de la cotización (arriba a la derecha)
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('COTIZACIÓN', pageWidth - margin, yPos + 8, { align: 'right' });
            
            // Número de cotización
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            const quoteNumber = quote.number ? `COT-${String(quote.number).padStart(5, '0')}` : 'Nueva Cotización';
            doc.text(quoteNumber, pageWidth - margin, yPos + 16, { align: 'right' });

            yPos += 35;

            // Línea separadora
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;

            // Información del cliente
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 51, 51);
            doc.text('CLIENTE', margin, yPos);
            yPos += 6;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(quote.clientName || 'Sin seleccionar', margin, yPos);
            yPos += 15;

            // Fechas
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            const today = new Date().toLocaleDateString('es-VE');
            const validUntil = quote.validUntil 
                ? new Date(quote.validUntil).toLocaleDateString('es-VE') 
                : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-VE');
            doc.text(`Fecha: ${today}`, margin, yPos);
            doc.text(`Válida hasta: ${validUntil}`, pageWidth / 2, yPos);
            yPos += 15;

            // Tabla de items con color primario dinámico
            const items = prepareItems();
            const tableData = items.map((item, index) => [
                index + 1,
                item.service,
                item.ally,
                item.destination,
                item.quantity,
                `$${item.unitPrice.toFixed(2)}`,
                `$${item.subtotal.toFixed(2)}`
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['#', 'Servicio', 'Aliado', 'Destino', 'Cant.', 'P. Unit.', 'Subtotal']],
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
                    4: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 22, halign: 'right' },
                    6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
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
            doc.text(`$${quote.total.toFixed(2)}`, pageWidth - margin - 5, yPos + 15, { align: 'right' });

            yPos += 35;

            // Notas
            if (quote.notes) {
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
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `${companyName} - ${companySlogan}`, 
                pageWidth / 2, 
                pageHeight - 10, 
                { align: 'center' }
            );

            // Descargar
            doc.save(`cotizacion_${quoteNumber.replace('-', '_')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setGenerating(false);
        }
    };

    const items = prepareItems();

    return (
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
                            <p className="text-sm text-slate-500">Revise antes de descargar</p>
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
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Cliente</p>
                                    <p className="font-semibold text-slate-800">{quote.clientName || 'Sin seleccionar'}</p>
                                </div>
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
                                        <th className="py-2 px-3 text-left font-medium">Aliado</th>
                                        <th className="py-2 px-3 text-left font-medium">Destino</th>
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
                                            <td className="py-2 px-3">{item.ally}</td>
                                            <td className="py-2 px-3">{item.destination}</td>
                                            <td className="py-2 px-3 text-center">{item.quantity}</td>
                                            <td className="py-2 px-3 text-right">${item.unitPrice.toFixed(2)}</td>
                                            <td className="py-2 px-3 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Total */}
                            <div className="flex justify-end mb-6">
                                <div className="bg-slate-800 text-white px-6 py-3 rounded-lg">
                                    <span className="text-slate-300 text-sm mr-4">TOTAL</span>
                                    <span className="text-xl font-bold">${quote.total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Notas */}
                            {quote.notes && (
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
                                Descargar PDF
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotePDFModal;
