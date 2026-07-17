import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, X, Loader2, Wallet } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayLocal } from '../../utils/dateHelpers';
import authService from '../../services/auth.service';
import QuickCreateSvcProviderModal from '../shared/QuickCreateSvcProviderModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.5rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const PayableFormModal = ({ isOpen, onClose, onSuccess, payable, defaultType, defaultEmployeeId }) => {
    const { user } = useAuth();
    const [allies, setAllies] = useState([]);
    const [svcProviders, setSvcProviders] = useState([]);
    const [users, setUsers] = useState([]);

    const [beneficiaryType, setBeneficiaryType] = useState('ally'); // 'ally' | 'provider' | 'employee'
    const [allyId, setAllyId] = useState('');
    const [svcProviderId, setSvcProviderId] = useState('');
    const [employeeUserId, setEmployeeUserId] = useState('');
    const [description, setDescription] = useState('');
    const [invoiceNr, setInvoiceNr] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const isEdit = Boolean(payable);
    const lockedEmployee = Boolean(defaultEmployeeId) && !isEdit;

    // Estado para pago a empleados: modo "sueldo ya pagado" vs "cuenta pendiente"
    const [paymentMode, setPaymentMode] = useState('paid'); // 'paid' | 'pending'
    const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(getTodayLocal());

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

    const userOptions = useMemo(() =>
        (users || []).filter(u => u.isActive !== false).map(u => ({
            value: u.id,
            label: `${u.name}${u.position ? ' — ' + u.position : ''}`,
            subLabel: u.position || (u.role === 'ADMIN' ? 'Administrador' : 'Ventas')
        })),
        [users]
    );

    useEffect(() => {
        if (!isOpen) return;

        const fetchAll = async () => {
            try {
                const [aRes, pRes, uRes] = await Promise.all([
                    axios.get(`${API_URL}/allies?all=true`, { withCredentials: true }),
                    axios.get(`${API_URL}/svc-providers?all=true`, { withCredentials: true }),
                    authService.getUsers(),
                ]);
                setAllies(aRes.data.data || []);
                setSvcProviders(pRes.data.data || pRes.data || []);
                setUsers(uRes.users || []);
            } catch (err) {
                console.error('Error cargando catálogos:', err);
            }
        };
        fetchAll();
    }, [isOpen]);

    const resetForm = () => {
        setBeneficiaryType(defaultType || 'ally');
        setAllyId('');
        setSvcProviderId('');
        setEmployeeUserId('');
        setDescription('');
        setAmount('');
        setDueDate('');
        setInvoiceNr('');
        setPaymentMode('paid');
        setPaymentMethod('TRANSFER');
        setPaymentReference('');
        setPaymentDate(getTodayLocal());
    };

    useEffect(() => {
        if (!isOpen) return;
        if (defaultType && !payable) {
            setBeneficiaryType(defaultType);
        }
        if (payable) {
            if (payable.employeeUserId || payable.employeeUser) {
                setBeneficiaryType('employee');
                setEmployeeUserId(payable.employeeUserId || payable.employeeUser?.id || '');
                setAllyId('');
                setSvcProviderId('');
            } else if (payable.allyId || payable.ally) {
                setBeneficiaryType('ally');
                setAllyId(payable.allyId || payable.ally?.id || '');
                setSvcProviderId('');
                setEmployeeUserId('');
            } else if (payable.svcProviderId || payable.svcProvider) {
                setBeneficiaryType('provider');
                setSvcProviderId(payable.svcProviderId || payable.svcProvider?.id || '');
                setAllyId('');
                setEmployeeUserId('');
            } else {
                setBeneficiaryType('ally');
                setAllyId('');
                setSvcProviderId('');
                setEmployeeUserId('');
            }
            setDescription(payable.description || '');
            setAmount(payable.amount ? Number(payable.amount).toString() : '');
            setDueDate(payable.dueDate ? new Date(payable.dueDate).toISOString().slice(0, 10) : '');
            setInvoiceNr(payable.invoiceNr || '');
        } else {
            resetForm();
            if (defaultEmployeeId) {
                setBeneficiaryType('employee');
                setEmployeeUserId(defaultEmployeeId);
            }
        }
    }, [isOpen, payable, defaultType, defaultEmployeeId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const selectedAlly = beneficiaryType === 'ally' ? allyId : null;
        const selectedProvider = beneficiaryType === 'provider' ? svcProviderId : null;
        const selectedEmployee = beneficiaryType === 'employee' ? employeeUserId : null;

        if (!selectedAlly && !selectedProvider && !selectedEmployee) {
            return showError('Validación', 'Debe seleccionar un aliado, proveedor o empleado');
        }
        if (!description.trim()) {
            return showError('Validación', 'La descripción es requerida');
        }
        if (!amount || parseFloat(amount) <= 0) {
            return showError('Validación', 'El monto debe ser mayor a 0');
        }

        if (dueDate) {
            const today = getTodayLocal();
            const selectedDate = new Date(dueDate);
            const todayDate = new Date(today);
            selectedDate.setHours(0, 0, 0, 0);
            todayDate.setHours(0, 0, 0, 0);
            if (selectedDate < todayDate && paymentMode !== 'paid') {
                return showError('Validación', 'La fecha límite no puede ser anterior a la fecha actual');
            }
        }

        setSaving(true);
        try {
            const payload = {
                allyId: selectedAlly || null,
                svcProviderId: selectedProvider || null,
                employeeUserId: selectedEmployee || null,
                description: description.trim(),
                amount: parseFloat(amount),
                currency: 'USD',
                dueDate: dueDate || null,
                invoiceNr: invoiceNr.trim() || null
            };

            if (isEdit) {
                await axios.put(`${API_URL}/payables/${payable.id}`, payload, { withCredentials: true });
                showSuccess('Cuenta actualizada', 'La cuenta por pagar se actualizó correctamente');
                onSuccess?.();
                onClose?.();
                return;
            }

            // Crear la cuenta por pagar
            const res = await axios.post(`${API_URL}/payables`, payload);
            const newPayable = res.data.data || res.data;

            // Si es pago a empleado y modo "Ya pagado", crear el abono inmediatamente
            if (beneficiaryType === 'employee' && paymentMode === 'paid' && newPayable?.id) {
                await axios.post(`${API_URL}/payables/${newPayable.id}/payments`, {
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    reference: paymentReference.trim() || undefined,
                    date: paymentDate,
                });
                showSuccess('¡Sueldo registrado!', `Se registró el pago de $${parseFloat(amount).toFixed(2)} a ${userOptions.find(o => o.value === employeeUserId)?.label || 'empleado'}`);
            } else {
                showSuccess('¡Cuenta creada!', 'La cuenta por pagar se registró correctamente');
            }

            resetForm();
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${beneficiaryType === 'employee' ? 'bg-blue-50' : 'bg-red-50'}`}>
                            {beneficiaryType === 'employee' ? <Wallet className="text-blue-600" size={22} /> : <Receipt className="text-red-500" size={22} />}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg">
                                {isEdit ? 'Editar Cuenta por Pagar' : beneficiaryType === 'employee' ? 'Registrar Pago a Empleado' : 'Nueva Cuenta por Pagar'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {isEdit ? 'Actualiza la información general' : beneficiaryType === 'employee' ? 'Registra un pago a un empleado' : 'Registra una deuda con un aliado o proveedor'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">

                    {!lockedEmployee && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Tipo de Beneficiario</label>
                            <div className="flex gap-2">
                                <button type="button"
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                        beneficiaryType === 'ally'
                                            ? 'border-sky-500 bg-sky-50 text-sky-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                    }`}
                                    onClick={() => { setBeneficiaryType('ally'); setSvcProviderId(''); setEmployeeUserId(''); }}
                                >
                                    Aliado
                                </button>
                                <button type="button"
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                        beneficiaryType === 'provider'
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                    }`}
                                    onClick={() => { setBeneficiaryType('provider'); setAllyId(''); setEmployeeUserId(''); }}
                                >
                                    Proveedor
                                </button>
                                <button type="button"
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                        beneficiaryType === 'employee'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                                    }`}
                                    onClick={() => { setBeneficiaryType('employee'); setAllyId(''); setSvcProviderId(''); }}
                                >
                                    Empleado
                                </button>
                            </div>
                        </div>
                    )}

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
                    ) : beneficiaryType === 'provider' ? (
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
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Empleado</label>
                            {lockedEmployee ? (
                                <div className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {userOptions.find(o => o.value === employeeUserId)?.label || 'Empleado seleccionado'}
                                </div>
                            ) : (
                                <Select
                                    options={userOptions}
                                    value={userOptions.find(o => o.value === employeeUserId) || null}
                                    onChange={(opt) => setEmployeeUserId(opt?.value || '')}
                                    placeholder="Seleccionar empleado..."
                                    isClearable
                                    styles={selectStyles}
                                    menuPortalTarget={document.body}
                                    noOptionsMessage={() => 'Sin resultados'}
                                />
                            )}
                        </div>
                    )}

                    {beneficiaryType === 'employee' && !isEdit && (
                        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Pago</p>
                            <div className="flex gap-2">
                                <button type="button"
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                        paymentMode === 'paid'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                    }`}
                                    onClick={() => setPaymentMode('paid')}
                                >
                                    <span className="block font-semibold">💰 Sueldo</span>
                                    <span className="text-[10px] opacity-80">Ya pagado</span>
                                </button>
                                <button type="button"
                                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl border-2 transition-all ${
                                        paymentMode === 'pending'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                    }`}
                                    onClick={() => setPaymentMode('pending')}
                                >
                                    <span className="block font-semibold">📌 Préstamo</span>
                                    <span className="text-[10px] opacity-80">Pendiente</span>
                                </button>
                            </div>
                            {paymentMode === 'paid' && (
                                <p className="text-[11px] text-slate-400 italic">
                                    Se creará la cuenta y se registrará el pago de una vez.
                                </p>
                            )}
                            {paymentMode === 'pending' && (
                                <p className="text-[11px] text-slate-400 italic">
                                    Se creará como cuenta pendiente. Podrás registrar abonos después.
                                </p>
                            )}
                        </div>
                    )}

                    {beneficiaryType === 'employee' && paymentMode === 'paid' && !isEdit && (
                        <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Datos del Pago
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Método</label>
                                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-sm">
                                        <option value="TRANSFER">Transferencia</option>
                                        <option value="INTL_TRANSFER">Transf. Internacional</option>
                                        <option value="P_MOBILE">Pago Móvil</option>
                                        <option value="BINANCE_USDT">Binance USDT</option>
                                        <option value="ZELLE">Zelle</option>
                                        <option value="CASH_USD">Efectivo USD</option>
                                        <option value="OTHER">Otro</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700">Fecha</label>
                                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-sm" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Referencia <span className="text-slate-400">(opcional)</span></label>
                                <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-sm"
                                    placeholder="Ej: #00123456" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Número de Factura <span className="text-slate-400">(opcional)</span></label>
                        <input
                            type="text"
                            value={invoiceNr}
                            onChange={e => setInvoiceNr(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            placeholder={beneficiaryType === 'employee' ? 'Ej: Q-001, Quincena Junio' : 'Ej: FAC-00123'}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Descripción</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            rows={2}
                            placeholder={beneficiaryType === 'employee' ? 'Ej: Sueldo correspondiente a quincena...' : 'Ej: Pago por transporte de carga...'}
                            required
                        />
                    </div>

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

                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className={`px-5 py-2.5 rounded-xl font-medium shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm ${
                                beneficiaryType === 'employee'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                                    : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                            }`}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                            {isEdit
                                ? 'Guardar cambios'
                                : beneficiaryType === 'employee'
                                    ? paymentMode === 'paid' ? 'Registrar Sueldo' : 'Crear Cuenta Pendiente'
                                    : 'Crear Cuenta'}
                        </button>
                    </div>
                </form>

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