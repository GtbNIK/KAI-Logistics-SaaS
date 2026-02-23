import { useState, useEffect } from 'react';
import { Activity, X, Loader2 } from 'lucide-react';

const ChangeQuoteStatusModal = ({ isOpen, onClose, quote, onUpdateStatus }) => {
    const [status, setStatus] = useState('DRAFT');
    const [loading, setLoading] = useState(false);

    // Sincronizamos el estado del select c/vez que se abre con una cotización distinta
    useEffect(() => {
        if (quote?.status) setStatus(quote.status);
    }, [quote?.status, isOpen]);

    if (!isOpen || !quote) return null;

    const statuses = [
        { value: 'DRAFT',    label: 'Borrador'  },
        { value: 'SENT',     label: 'Enviada'   },
        { value: 'APPROVED', label: 'Aprobada'  },
        { value: 'REJECTED', label: 'Rechazada' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onUpdateStatus(quote.id, status);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Activity className="text-primary" size={20} />
                        <h3 className="font-bold">Actualizar Estado</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="space-y-1 text-sm text-slate-500">
                        <p>Cotización: <span className="font-semibold text-slate-800">COT-{String(quote.number).padStart(5, '0')}</span></p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700">Nuevo Estado</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                        >
                            {statuses.map(s => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || status === quote.status}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangeQuoteStatusModal;
