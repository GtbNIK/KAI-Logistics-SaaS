import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { generateClosurePdf } from './closurePdfGenerator';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';

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
