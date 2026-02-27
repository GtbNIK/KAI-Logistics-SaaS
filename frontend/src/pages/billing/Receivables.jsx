import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, CreditCard, Plus, X, DollarSign, Wallet, Clock, BadgeDollarSign, Filter, FileText } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import EntityTable from '../../components/shared/EntityTable';
import { receivableConfig } from '../../config/receivableConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const paymentMethods = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    { value: 'ZELLE',    label: 'Zelle' },
    { value: 'CASH_USD', label: 'Efectivo USD' },
    { value: 'CASH_VES', label: 'Efectivo Bs.' },
    { value: 'OTHER',    label: 'Otro' },
];

// ─── Hook de datos ────────────────────────────────────────────────────────────
const useReceivables = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 1200);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => { setPage(1); }, [statusFilter]);

    const fetchReceivables = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            if (statusFilter) params.append('status', statusFilter);
            const res = await axios.get(`${API_URL}/receivables?${params}`);
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las cuentas por cobrar');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter]);

    useEffect(() => { fetchReceivables(); }, [fetchReceivables]);

    return {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter,
        refresh: fetchReceivables
    };
};

// ─── Modal para registrar pago ────────────────────────────────────────────────
const RegisterPaymentModal = ({ receivable, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('TRANSFER');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();

    if (!receivable) return null;
    const pendingBalance = parseFloat(receivable.totalAmount) - parseFloat(receivable.paidAmount || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return showError('Validación', 'El monto debe ser mayor a 0');
        if (parseFloat(amount) > pendingBalance + 0.01) return showError('Validación', `No puede superar $${pendingBalance.toFixed(2)}`);
        setLoading(true);
        try {
            await axios.post(`${API_URL}/receivables/${receivable.id}/payments`, {
                amount: parseFloat(amount), method, reference: reference || undefined, date, notes: notes || undefined
            });
            showSuccess('¡Pago Registrado!', `Se abonaron $${parseFloat(amount).toFixed(2)}`);
            onSuccess();
            onClose();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl">
                            <CreditCard className="text-green-600" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Registrar Pago</h3>
                            <p className="text-xs text-slate-500">{receivable.paymentNotice?.client?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="mx-6 mt-5 bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border border-slate-100">
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">Total</p>
                        <p className="font-bold text-slate-700 text-sm">${parseFloat(receivable.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-xs text-green-500 mb-0.5">Abonado</p>
                        <p className="font-bold text-green-600 text-sm">${parseFloat(receivable.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                        <p className="text-xs text-amber-500 mb-0.5">Pendiente</p>
                        <p className="font-bold text-amber-600 text-sm">${pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Monto a Abonar (USD)</label>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-slate-50">
                            <span className="text-slate-400 font-medium text-sm">$</span>
                            <input type="number" step="0.01" min="0.01" max={pendingBalance}
                                value={amount} onChange={e => setAmount(e.target.value)}
                                className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                                placeholder={`Máx. ${pendingBalance.toFixed(2)}`} required />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Método de Pago</label>
                        <select value={method} onChange={e => setMethod(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50">
                            {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Referencia <span className="text-slate-400">(opcional)</span></label>
                        <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            placeholder="Ej: #00123456" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Fecha del Pago</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700">Notas <span className="text-slate-400">(opcional)</span></label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-slate-50"
                            rows={2}
                            placeholder="Información adicional del pago..." />
                    </div>
                    <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm">
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Plus size={16} />
                            }
                            Registrar Abono
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Modal de historial de pagos ──────────────────────────────────────────────
const ReceivableDetailModal = ({ receivable, onClose, onRegisterPayment }) => {
    if (!receivable) return null;
    const r = receivable;
    const pendingBalance = parseFloat(r.totalAmount) - parseFloat(r.paidAmount || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <TrendingUp className="text-primary" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-xl">
                                {r.paymentNotice?.client?.name || 'N/A'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                AVC-{String(r.paymentNotice?.number || 0).padStart(5, '0')} · Cuenta por Cobrar
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <DollarSign size={18} className="mx-auto text-slate-400 mb-1" />
                            <p className="text-xs text-slate-400 mb-0.5">Total</p>
                            <p className="font-bold text-slate-800 text-sm">${parseFloat(r.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                            <Wallet size={18} className="mx-auto text-green-500 mb-1" />
                            <p className="text-xs text-green-500 mb-0.5">Pagado</p>
                            <p className="font-bold text-green-700 text-sm">${parseFloat(r.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                            <Clock size={18} className="mx-auto text-amber-500 mb-1" />
                            <p className="text-xs text-amber-500 mb-0.5">Pendiente</p>
                            <p className="font-bold text-amber-700 text-sm">${pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Historial de Pagos</h3>
                            {r.status !== 'PAID' && (
                                <button onClick={() => onRegisterPayment(r)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                    <Plus size={14} /> Registrar Abono
                                </button>
                            )}
                        </div>
                        {(!r.payments || r.payments.length === 0) ? (
                            <div className="flex flex-col items-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                <BadgeDollarSign size={32} className="opacity-30 mb-2" />
                                <p className="text-sm">Sin pagos registrados todavía</p>
                            </div>
                        ) : (
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fecha</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Método</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Referencia</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Notas</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {r.payments.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    {new Date(p.date || p.createdAt).toLocaleDateString('es-VE')}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {paymentMethods.find(m => m.value === p.method)?.label || p.method}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{p.reference || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={p.notes || ''}>{p.notes || '—'}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                    +${parseFloat(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Receivables = () => {
    const [viewingReceivable, setViewingReceivable] = useState(null);
    const [registeringPayment, setRegisteringPayment] = useState(null);
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, statusFilter, setStatusFilter, refresh
    } = useReceivables();

    const totalPending = items.reduce((acc, r) => {
        if (r.status !== 'PAID') acc += parseFloat(r.totalAmount) - parseFloat(r.paidAmount || 0);
        return acc;
    }, 0);

    const handleRegisterPayment = (r) => {
        setViewingReceivable(null);
        setRegisteringPayment(r);
    };

    // Filtro extra: select de estado que se inyecta en EntityTable vía extraFilters
    const statusSelect = (
        <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-700"
        >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIALLY_PAID">Abonada</option>
            <option value="PAID">Pagada</option>
        </select>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        Cuentas por Cobrar
                    </h1>
                    <p className="text-slate-500 mt-1">Cartera activa de clientes con saldo pendiente</p>
                </div>
                {totalPending > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-right shrink-0">
                        <p className="text-xs text-amber-500 font-medium">Saldo pendiente en vista</p>
                        <p className="text-xl font-bold text-amber-700">
                            ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                )}
            </div>

            <EntityTable
                entityName={receivableConfig.entityName}
                entityNamePlural={receivableConfig.entityNamePlural}
                columns={receivableConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={false}
                canDelete={false}
                canPrint={false}
                extraFilters={statusSelect}
                onView={(item) => setViewingReceivable(item)}
                extraActions={(item) => item.status !== 'PAID' && (
                    <button
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Registrar pago"
                        onClick={(e) => { e.stopPropagation(); handleRegisterPayment(item); }}
                    >
                        <Plus size={18} />
                    </button>
                )}
            />

            {viewingReceivable && (
                <ReceivableDetailModal
                    receivable={viewingReceivable}
                    onClose={() => setViewingReceivable(null)}
                    onRegisterPayment={handleRegisterPayment}
                />
            )}
            {registeringPayment && (
                <RegisterPaymentModal
                    receivable={registeringPayment}
                    onClose={() => setRegisteringPayment(null)}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
};

export default Receivables;
