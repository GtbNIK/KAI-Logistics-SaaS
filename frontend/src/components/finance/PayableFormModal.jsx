import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayLocal } from '../../utils/dateHelpers';
import QuickCreateSvcProviderModal from '../shared/QuickCreateSvcProviderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.5rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const PayableFormModal = ({ isOpen, onClose, onSuccess, payable }) => {
    const { user } = useAuth();
    const [allies, setAllies] = useState([]);
    const [svcProviders, setSvcProviders] = useState([]);

    const [beneficiaryType, setBeneficiaryType] = useState('ally'); // 'ally' | 'provider'
    const [allyId, setAllyId] = useState('');
    const [svcProviderId, setSvcProviderId] = useState('');
    const [description, setDescription] = useState('');
    const [invoiceNr, setInvoiceNr] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const isEdit = Boolean(payable);

    const allyOptions = useMemo(() =>
        (allies || []).filter(a => a.isActive !== false).map(a => ({ value: a.id, label: a.name })),
        [allies]
    );

    const baseProviderOptions = useMemo(() =>
        (svcProviders || []).map(p => ({ value: p.id, label: p.name })),
        [svcProviders]
    );
    const providerOptions = useMemo(() =>
        user?.role === 'ADMIN'
            ? [...baseProviderOptions, { value: 'NEW', label: '+ Agregar nuevo proveedor', isAction: true }]
            : baseProviderOptions,
        [baseProviderOptions, user]
    );

    useEffect(() => {
        if (!isOpen) return;

        const fetchAll = async () => {
            try {
                const [aRes, pRes] = await Promise.all([
                    axios.get(`${API_URL}/allies?all=true`, { withCredentials: true }),
                    axios.get(`${API_URL}/svc-providers?all=true`, { withCredentials: true }),
                ]);
                setAllies(aRes.data.data || []);
                setSvcProviders(pRes.data.data || pRes.data || []);
            } catch (err) {
                console.error('Error cargando catálogos:', err);
            }
        };
        fetchAll();
    }, [isOpen]);


    const resetForm = () => {
        setBeneficiaryType('ally');
        setAllyId('');
        setSvcProviderId('');
        setDescription('');
        setAmount('');
        setDueDate('');
        setInvoiceNr('');
    };

    useEffect(() => {
        if (!isOpen) return;
        if (payable) {
            if (payable.allyId || payable.ally) {
                setBeneficiaryType('ally');
                setAllyId(payable.allyId || payable.ally?.id || '');
                setSvcProviderId('');
            } else if (payable.svcProviderId || payable.svcProvider) {
                setBeneficiaryType('provider');
                setSvcProviderId(payable.svcProviderId || payable.svcProvider?.id || '');
                setAllyId('');
            } else {
                setBeneficiaryType('ally');
                setAllyId('');
                setSvcProviderId('');
            }
            setDescription(payable.description || '');
            setAmount(payable.amount ? Number(payable.amount).toString() : '');
            setDueDate(payable.dueDate ? new Date(payable.dueDate).toISOString().slice(0, 10) : '');
            setInvoiceNr(payable.invoiceNr || '');
        } else {
            resetForm();
        }
    }, [isOpen, payable]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const selectedAlly = beneficiaryType === 'ally' ? allyId : null;
        const selectedProvider = beneficiaryType === 'provider' ? svcProviderId : null;

        if (!selectedAlly && !selectedProvider) {
            return showError('Validación', 'Debe seleccionar un aliado o un proveedor');
        }
        if (!description.trim()) {
            return showError('Validación', 'La descripción es requerida');
        }
        if (!amount || parseFloat(amount) <= 0) {
            return showError('Validación', 'El monto debe ser mayor a 0');
        }

        // Validar fecha límite no sea menor a fecha actual
        if (dueDate) {
            const today = getTodayLocal();
            const selectedDate = new Date(dueDate);
            const todayDate = new Date(today);
            
            // Comparar solo fechas (ignorar horas)
            selectedDate.setHours(0, 0, 0, 0);
            todayDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < todayDate) {
                return showError('Validación', 'La fecha límite no puede ser anterior a la fecha actual');
            }
        }

        setSaving(true);
        try {
            const payload = {
                allyId: selectedAlly || null,
                svcProviderId: selectedProvider || null,
                description: description.trim(),
                amount: parseFloat(amount),
                dueDate: dueDate || null,
                invoiceNr: invoiceNr.trim() || null
            };

            if (isEdit) {
                await axios.put(`${API_URL}/payables/${payable.id}`, payload, { withCredentials: true });
                showSuccess('Cuenta actualizada', 'La cuenta por pagar se actualizó correctamente');
            } else {
                await axios.post(`${API_URL}/payables`, payload);
                showSuccess('¡Cuenta creada!', 'La cuenta por pagar se registró correctamente');
                resetForm();
            }
            onSuccess?.();
            onClose?.();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'No se pudo guardar la cuenta');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-xl">
                            <Receipt className="text-red-500" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg">{isEdit ? 'Editar Cuenta por Pagar' : 'Nueva Cuenta por Pagar'}</h2>
                            <p className="text-xs text-slate-500">{isEdit ? 'Actualiza la información general' : 'Registra una deuda con un aliado o proveedor'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">

                    {/* Tipo de beneficiario */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Tipo de Beneficiario</label>
                        <div className="flex gap-2">
                            <button type="button"
                                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                    beneficiaryType === 'ally'
                                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                }`}
                                onClick={() => { setBeneficiaryType('ally'); setSvcProviderId(''); }}
                            >
                                Aliado
                            </button>
                            <button type="button"
                                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                    beneficiaryType === 'provider'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                }`}
                                onClick={() => { setBeneficiaryType('provider'); setAllyId(''); }}
                            >
                                Proveedor de Servicios
                            </button>
                        </div>
                    </div>

                    {/* Select de Aliado o CreatableSelect de Proveedor */}
                    {beneficiaryType === 'ally' ? (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Aliado</label>
                            <Select
                                options={allyOptions}
                                value={allyOptions.find(o => o.value === allyId) || null}
                                onChange={(opt) => setAllyId(opt?.value || '')}
                                placeholder="Seleccionar aliado..."
                                isClearable
                                styles={selectStyles}
                                menuPortalTarget={document.body}
                                noOptionsMessage={() => 'Sin resultados'}
                            />
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Proveedor de Servicios</label>
                            <Select
                                options={providerOptions}
                                value={baseProviderOptions.find(o => o.value === svcProviderId) || null}
                                onChange={(opt) => {
                                    if (opt?.value === 'NEW') {
                                        setQuickCreateOpen(true);
                                        return;
                                    }
                                    setSvcProviderId(opt?.value || '');
                                }}
                                placeholder="Seleccionar proveedor..."
                                isClearable
                                styles={{
                                    ...selectStyles,
                                    option: (base, state) => ({
                                        ...base,
                                        color: state.data.isAction ? '#12284bff' : base.color,
                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                    })
                                }}
                                menuPortalTarget={document.body}
                                noOptionsMessage={() => 'Sin resultados'}
                            />
                        </div>
                    )}

                    {/* Número de factura */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Número de Factura (Invoice)</label>
                        <span className="text-xs text-slate-400"> Opcional</span>
                        <input
                            type="text"
                            value={invoiceNr}
                            onChange={e => setInvoiceNr(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            placeholder="Ej: FAC-00123"
                        />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Descripción</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            rows={2}
                            placeholder="Ej: Pago por transporte de carga..."
                            required
                        />
                    </div>

                    {/* Monto y Fecha */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Monto (USD)</label>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-slate-50">
                                <span className="text-slate-400 font-medium text-sm">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Fecha Límite <span className="text-slate-400">(opcional)</span></label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                            {isEdit ? 'Guardar cambios' : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>

                {/* Quick Create SvcProvider Modal */}
                <QuickCreateSvcProviderModal
                    isOpen={quickCreateOpen}
                    onClose={() => setQuickCreateOpen(false)}
                    onSuccess={(newProvider) => {
                        setSvcProviders(prev => [...prev, { id: newProvider.value, name: newProvider.label }].sort((a, b) => a.name.localeCompare(b.name)));
                        setSvcProviderId(newProvider.value);
                        setQuickCreateOpen(false);
                    }}
                />
            </div>
        </div>,
        document.body
    );
};

export default PayableFormModal;
