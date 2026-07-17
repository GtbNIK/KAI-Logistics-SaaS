import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, X, Plus, Wallet } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import CurrencySelect from '../shared/CurrencySelect';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CreateReceivableModal = ({ isOpen, onClose, onSuccess, receivable }) => {
    const [clients, setClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [clientInputValue, setClientInputValue] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [manualNotes, setManualNotes] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [saving, setSaving] = useState(false);
    const [creditBalance, setCreditBalance] = useState(0);
    const { showSuccess, showError } = useToast();
    const isEdit = Boolean(receivable);

    const clientOptions = useMemo(() => {
        return (clients || []).map(c => ({ value: c.id, label: `${c.name} — ${c.rifOrId}` }));
    }, [clients]);

    const filteredClients = useMemo(() => {
        if (!clientInputValue.trim()) return clientOptions;
        const search = clientInputValue.toLowerCase();
        return clientOptions.filter(c => c.label.toLowerCase().includes(search));
    }, [clientOptions, clientInputValue]);

    useEffect(() => {
        if (!isOpen) return;
        axios.get(`${API_URL}/clients?all=true`, { withCredentials: true })
            .then(res => setClients(res.data.data || []))
            .catch(() => {});
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        if (receivable) {
            setClientId(receivable.clientId || receivable.client?.id || '');
            setClientInputValue('');
            setTotalAmount(receivable.totalAmount ? Number(receivable.totalAmount).toString() : '');
            setManualNotes(receivable.manualNotes || '');
            setCurrency(receivable.currency || 'USD');
            setCreditBalance(0);
        } else {
            setClientId('');
            setClientInputValue('');
            setTotalAmount('');
            setManualNotes('');
            setCurrency('USD');
            setCreditBalance(0);
        }
    }, [isOpen, receivable]);

    useEffect(() => {
        if (!clientId || isEdit) {
            setCreditBalance(0);
            return;
        }
        axios.get(`${API_URL}/clients/${clientId}/receivables-summary`, { withCredentials: true })
            .then(res => setCreditBalance(res.data.creditBalance || 0))
            .catch(() => setCreditBalance(0));
    }, [clientId, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!clientId) return showError('Validación', 'Selecciona un cliente');
        if (!totalAmount || parseFloat(totalAmount) <= 0) return showError('Validación', 'El monto debe ser mayor a 0');

        setSaving(true);
        try {
            const payload = {
                clientId,
                totalAmount: parseFloat(totalAmount),
                currency,
                manualNotes: manualNotes || undefined,
            };

            if (isEdit) {
                await axios.put(`${API_URL}/receivables/${receivable.id}`, payload, { withCredentials: true });
                showSuccess('Actualizada', 'La cuenta por cobrar se actualizó correctamente');
            } else {
                await axios.post(`${API_URL}/receivables`, payload, { withCredentials: true });
                showSuccess('Creada', 'Cuenta por cobrar creada correctamente');
            }

            onSuccess?.();
            onClose?.();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo guardar la cuenta por cobrar');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/20 rounded-xl">
                            <TrendingUp className="text-secondary" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{isEdit ? 'Editar Cuenta por Cobrar' : 'Nueva Cuenta por Cobrar'}</h3>
                            <p className="text-xs text-slate-500">{isEdit ? 'Actualiza la información general' : 'Creación manual'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Cliente</label>
                        <Select
                            options={filteredClients}
                            value={filteredClients.find(o => o.value === clientId) || null}
                            onChange={(opt) => setClientId(opt?.value || '')}
                            onInputChange={(v) => setClientInputValue(v)}
                            placeholder="Selecciona un cliente..."
                            isClearable
                            classNamePrefix="select"
                        />
                        </div>

                    {/* Moneda */}
                    <CurrencySelect value={currency} onChange={setCurrency} disabled={isEdit} />

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Monto Total ({getCurrencySymbol(currency)})</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-slate-50">
                            <span className="text-slate-400 font-medium text-sm">{getCurrencySymbol(currency)}</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={totalAmount}
                                onChange={e => setTotalAmount(e.target.value)}
                                className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {!isEdit && creditBalance > 0 && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-emerald-100 rounded-lg shrink-0">
                                    <Wallet className="text-emerald-600" size={18} />
                                </div>
                                <div className="text-sm text-emerald-800">
                                    <p className="font-semibold mb-0.5">Saldo a favor disponible</p>
                                    <p>
                                        Este cliente tiene un saldo a favor de <strong>{formatCurrency(Number(creditBalance), 'USD')}</strong>. Se agregará automáticamente como abono a esta cuenta por cobrar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Notas <span className="text-slate-400">(opcional)</span></label>
                        <textarea
                            value={manualNotes}
                            onChange={e => setManualNotes(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            rows={3}
                            placeholder="Información adicional de esta cuenta por cobrar..."
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm"
                        >
                            {saving
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Plus size={16} />
                            }
                            {isEdit ? 'Guardar cambios' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CreateReceivableModal;
