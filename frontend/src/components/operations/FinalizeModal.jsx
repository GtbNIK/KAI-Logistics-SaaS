import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, FileText, DollarSign, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const FinalizeModal = ({ isOpen, onClose, note, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();

    if (!isOpen || !note) return null;

    const total = (note.items || []).reduce((acc, i) => acc + Number(i.totalPrice || 0), 0);

    const handleFinalize = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/delivery-notes/${note.id}/finalize`, {}, { withCredentials: true });
            showSuccess('Finalizada', 'Nota de entrega cerrada. Se generó el Aviso de Cobro y la Cuenta por Cobrar.');
            onSuccess();
            onClose();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al finalizar la nota');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-xl">
                        <Check className="text-green-600" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Confirmar Entrega</h3>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-600">
                        Al confirmar la entrega de <strong>NDE-{String(note.number).padStart(5, '0')}</strong>, se generará automáticamente:
                    </p>
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">
                            <FileText className="text-purple-500" size={16} />
                            Un <strong>Aviso de Cobro</strong> por <span className="font-bold">${total.toFixed(2)}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <DollarSign className="text-emerald-500" size={16} />
                            Una <strong>Cuenta por Cobrar</strong> asociada al cliente
                        </li>
                    </ul>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                        ⚠️ Esta acción no se puede deshacer. La nota quedará en estado <strong>Entregada</strong>.
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleFinalize} disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {loading
                            ? <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                            : <><Check size={18} /> Confirmar Entrega</>
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FinalizeModal;
