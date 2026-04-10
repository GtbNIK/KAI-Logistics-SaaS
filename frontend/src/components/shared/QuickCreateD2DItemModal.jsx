import { useState } from 'react';
import { X, Save, Loader2, Package } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const QuickCreateD2DItemModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const [description, setDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API_URL}/d2d-items`, { description: description.trim() }, { withCredentials: true });
            const result = response.data;
            showSuccess('¡Éxito!', 'Item D2D creado correctamente');
            onSuccess({ value: result.id, label: result.description, data: result });
            setDescription('');
            onClose();
        } catch (error) {
            console.error('Error creating D2D item:', error);
            showError('Error', error.response?.data?.message || 'No se pudo crear el item D2D');
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
                        <Package size={18} className="text-primary" />
                        Nuevo Item D2D
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Descripción del Item *</label>
                        <input
                            required
                            type="text"
                            autoFocus
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            placeholder="Ej: Paletas, Montacargas..."
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
                            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
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

export default QuickCreateD2DItemModal;
