import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import dashboardService from '../../services/dashboard.service';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';

const DEFAULT_LOGO = '/1.png';

/**
 * Carga una imagen genérica como un objeto Image listo para jsPDF.
 * Maneja tanto URLs absolutas como relativas.
 */
const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen: ' + url));
        img.src = url;
    });
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [14, 165, 233];
};

export const generateClosurePdf = async (settings, showSuccess, showError, setLoading, dateRange, chartRef, donutChartRef, metrics) => {
    if (setLoading) setLoading(true);
    try {
        const result = await dashboardService.getMonthlyReport({
            startDate: dateRange?.startDate,
            endDate: dateRange?.endDate
        });
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const primaryColor = settings?.primaryColor || '#0ea5e9';
        const rgbColor = hexToRgb(primaryColor);

        // --- Header con fondo de color ---
        doc.setFillColor(...rgbColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(settings?.companyName || 'Compañia "N"', 14, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reporte Operativo: ${result.rangeLabel}`, 14, 30);

                // --- Logo en la esquina superior derecha ---
        try {
            const logoUrl = settings?.logoUrl || DEFAULT_LOGO;
            const logoImg = await loadImage(logoUrl);
            
            // Área máxima deseada para el logo: 40x30
            const maxW = 40;
            const maxH = 30;

            const imgRatio = logoImg.width / logoImg.height;
            const boxRatio = maxW / maxH;
            
            let finalWidth = maxW;
            let finalHeight = maxH;

            if (imgRatio > boxRatio) {
                // Más ancha que alta respecto al área permitida, se ajusta por ancho
                finalHeight = maxW / imgRatio;
            } else {
                // Más alta que ancha respecto al área permitida, se ajusta por alto
                finalWidth = maxH * imgRatio;
            }

            // Centrar verticalmente en el rectángulo azul/cabecera que mide 40 de alto y alinear la derecha
            const yPos = 20 - (finalHeight / 2);
            doc.addImage(logoImg, 'PNG', pageWidth - 14 - finalWidth, yPos, finalWidth, finalHeight);
        } catch (err) {
            console.warn('No se pudo cargar el logo para el PDF:', err);
        }

        // --- Resumen Financiero ---
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Financiero', 14, 55);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

        // Ingresos
        doc.text('Total Ingresos (CXC):', 14, 65);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(formatMoney(result.totalIngresos), 60, 65);

        // Egresos
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('Total Egresos (CXP):', 14, 75);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(244, 63, 94);
        doc.text(formatMoney(result.totalEgresos), 60, 75);

        // Balance
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('Balance Neto:', 14, 85);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(formatMoney(result.balanceNeto), 60, 85);

        // --- KPIs Operativos (Derecha) ---
        if (metrics) {
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Indicadores', 120, 55);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            
            doc.text('Cotizaciones Aprobadas:', 120, 65);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(14, 165, 233); // Blue
            doc.text(String(metrics.approvedQuotesCount || 0), 180, 65);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text('Cobradas:', 120, 75);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(16, 185, 129); // Emerald
            doc.text(formatMoney(metrics.cxcPaidAmount || 0), 180, 75);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text('Embarques en Curso:', 120, 85);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(245, 158, 11); // Amber
            doc.text(String(metrics.pendingShipmentsCount || 0), 180, 85);
            
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text('Por Pagar:', 120, 95);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(244, 63, 94); // Rose
            doc.text(formatMoney(metrics.cxpPendingAmount || 0), 180, 95);
        }

        // --- Captura de las gráficas ---
        let chartEndY = 110;
        
        const renderCharts = async () => {
            let currentChartMaxY = 110;

            // 1. Gráfica de Líneas
            if (chartRef?.current) {
                try {
                    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2, logging: false });
                    const chartImgData = canvas.toDataURL('image/png');
                    // Ocupará el 60% del ancho
                    const chartWidth = (pageWidth - 42) * 0.55; 
                    const chartHeight = (canvas.height / canvas.width) * chartWidth;

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(51, 65, 85);
                    doc.text('Cotizaciones Creadas', 14, 110);
                    doc.addImage(chartImgData, 'PNG', 14, 115, chartWidth, chartHeight);
                    currentChartMaxY = Math.max(currentChartMaxY, 115 + chartHeight);
                } catch (err) {
                    console.warn('No se pudo capturar la gráfica de líneas:', err);
                }
            }

            // 2. Gráfica de Donut
            if (donutChartRef?.current) {
                try {
                    const canvas2 = await html2canvas(donutChartRef.current, { backgroundColor: '#ffffff', scale: 2, logging: false });
                    const chartImgData2 = canvas2.toDataURL('image/png');
                    // Ocupará el 40% del ancho restante
                    const chartWidth2 = (pageWidth - 42) * 0.45; 
                    const chartHeight2 = (canvas2.height / canvas2.width) * chartWidth2;
                    const startX = 14 + ((pageWidth - 42) * 0.55) + 14;

                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(51, 65, 85);
                    // doc.text('Servicios Facturados', startX, 110);
                    doc.addImage(chartImgData2, 'PNG', startX, 110, chartWidth2, chartHeight2);
                    currentChartMaxY = Math.max(currentChartMaxY, 110 + chartHeight2);
                } catch (err) {
                    console.warn('No se pudo capturar la gráfica de donut:', err);
                }
            }
            
            chartEndY = currentChartMaxY + 10;
        };

        await renderCharts();

        // --- Tabla de Movimientos ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Registro de Transacciones', 14, chartEndY);

        const tableData = result.transactions.map((t, index) => [
            index + 1,
            new Date(t.createdAt).toLocaleDateString('es-VE'),
            t.typeStr,
            t.accountNumber,
            t.method || 'N/A',
            `${t.typeStr.includes('INGRESO') ? '+' : '-'} ${formatMoney(t.amount)}`,
            t.reference || 'N/A'
        ]);

        autoTable(doc, {
            startY: chartEndY + 5,
            head: [['#', 'Fecha', 'Tipo', 'Nro. Cuenta', 'Método', 'Monto', 'Referencia']],
            body: tableData,
            theme: 'striped',
            headStyles: { 
                fillColor: rgbColor, 
                textColor: 255, 
                fontStyle: 'bold' 
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 4 
            },
            columnStyles: {
                5: { halign: 'right', fontStyle: 'bold' },
                6: { cellWidth: 40 }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw.includes('+')) {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else if (data.cell.raw.includes('-')) {
                        data.cell.styles.textColor = [244, 63, 94];
                    }
                }
            }
        });

        // --- Pie de página ---
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Generado automáticamente el ${new Date().toLocaleString('es-VE')}`, 14, doc.internal.pageSize.height - 10);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }

        // Descargar
        const safeName = (result.rangeLabel || 'reporte').replace(/\s/g, '-').toLowerCase();
        const fileName = `reporte-operativo-${safeName}.pdf`;
        doc.save(fileName);
        if (showSuccess) showSuccess(`Reporte descargado: ${fileName}`);

    } catch (error) {
        console.error("Error generating report:", error);
        if (showError) showError("Error al generar el documento");
    } finally {
        if (setLoading) setLoading(false);
    }
};

const ClosureReportButton = ({ dateRange, chartRef, donutChartRef, metrics }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { settings } = useSettings();

    return (
        <button
            onClick={() => generateClosurePdf(settings, showSuccess, showError, setLoading, dateRange, chartRef, donutChartRef, metrics)}
            disabled={loading}
            style={{ backgroundColor: settings?.primaryColor || '#0ea5e9' }}
            className="flex items-center gap-2 hover:brightness-110 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            Generar PDF de Estadísticas
        </button>
    );
};

export default ClosureReportButton;
