import { useState } from 'react';
import { X, Save, Loader2, Plane } from 'lucide-react';
import airlineService from '../../services/airline.service';
import { useToast } from '../../context/ToastContext';

const QuickCreateAirLineModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await airlineService.createAirLine({
                name: name.trim(),
                code: code.trim() || undefined
            });
            showSuccess('¡Éxito!', 'Línea aérea creada correctamente');
            onSuccess({ value: result.id, label: result.name, data: result });
            setName('');
            setCode('');
            onClose();
        } catch (error) {
            console.error('Error creating airline:', error);
            showError('Error', error.response?.data?.message || 'No se pudo crear la línea aérea');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Plane size={18} className="text-sky-500" />
                        Nueva Línea Aérea
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Código IATA</label>
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                            maxLength={3}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-none transition-all text-sm uppercase"
                            placeholder="Ej: AA, DL, LA (opcional)"
                        />
                        <p className="text-xs text-slate-400 ml-1">Código de 2–3 letras según IATA</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nombre de la Aerolínea *</label>
                        <input
                            required
                            type="text"
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-400 outline-none transition-all text-sm"
                            placeholder="Ej: American Airlines, LATAM, Avianca"
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickCreateAirLineModal;
