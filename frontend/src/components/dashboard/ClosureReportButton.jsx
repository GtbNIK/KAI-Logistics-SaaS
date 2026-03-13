import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import dashboardService from '../../services/dashboard.service';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';

export const generateClosurePdf = async (settings, showSuccess, showError, setLoading) => {
    if (setLoading) setLoading(true);
    try {
        const result = await dashboardService.getMonthlyReport();
        
        const doc = new jsPDF();
        const primaryColor = settings?.primaryColor || '#0ea5e9';
        
        // Convertir color HEX a RGB para jsPDF
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ] : [14, 165, 233]; // Default a primaryColor fallbback
        };
        const rgbColor = hexToRgb(primaryColor);

        // --- Header ---
        doc.setFillColor(...rgbColor);
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(settings?.companyName || 'Importaciones Rangel', 14, 20);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(`Cierre de Mes: ${result.monthName}`, 14, 28);

        // --- Info General (Métricas Financieras) ---
        doc.setTextColor(51, 65, 85); // text-slate-700
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Financiero', 14, 55);

        // Cajas de texto simuladas
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

        // Ingresos
        doc.text('Total Ingresos (CXC):', 14, 65);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald-500
        doc.text(formatMoney(result.totalIngresos), 60, 65);

        // Egresos
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('Total Egresos (CXP):', 14, 75);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(244, 63, 94); // rose-500
        doc.text(formatMoney(result.totalEgresos), 60, 75);

        // Balance
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('Balance Neto:', 14, 85);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(formatMoney(result.balanceNeto), 60, 85);

        // --- Tabla de Movimientos del Mes ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Registro de Transacciones', 14, 105);

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
            startY: 110,
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
                        data.cell.styles.textColor = [16, 185, 129]; // emerald
                    } else if (data.cell.raw.includes('-')) {
                        data.cell.styles.textColor = [244, 63, 94]; // rose
                    }
                }
            }
        });

        // --- Pie de página ---
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(`Generado automáticamente el ${new Date().toLocaleString('es-VE')}`, 14, doc.internal.pageSize.height - 10);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }

        // Descargar PDF
        const fileName = `cierre-mes-${result.monthName.replace(' ', '-').toLowerCase()}.pdf`;
        doc.save(fileName);
        if (showSuccess) showSuccess(`Reporte descargado: ${fileName}`);

    } catch (error) {
        console.error("Error generating report:", error);
        if (showError) showError("Error al generar el documento de cierre");
    } finally {
        if (setLoading) setLoading(false);
    }
};

const ClosureReportButton = () => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const { settings } = useSettings();

    return (
        <button
            onClick={() => generateClosurePdf(settings, showSuccess, showError, setLoading)}
            disabled={loading}
            style={{ backgroundColor: settings?.primaryColor || '#0ea5e9' }}
            className="flex items-center gap-2 hover:brightness-110 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Download className="w-4 h-4" />
            )}
            Cierre de Mes (PDF)
        </button>
    );
};

export default ClosureReportButton;
