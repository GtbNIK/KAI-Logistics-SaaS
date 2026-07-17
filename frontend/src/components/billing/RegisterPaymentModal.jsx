import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, X, Plus } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../context/ToastContext';
import { getTodayLocal, toLocalISOString } from '../../utils/dateHelpers';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import OverpaymentConfirmModal from './OverpaymentConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const paymentMethods = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    {value: 'INTL_TRANSFER', label: 'Transferencia Internacional'},
    {value: 'P_MOBILE', label: 'Pago Móvil'},
    {value: 'BINANCE_USDT', label: 'Binance (USDT)'},
    { value: 'ZELLE',    label: 'Zelle' },
    { value: 'CASH_USD', label: 'Efectivo USD' },
    { value: 'OTHER',    label: 'Otro' },
];

const RegisterPaymentModal = ({ receivable, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('TRANSFER');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(getTodayLocal());
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingAmount, setPendingAmount] = useState(0);
    const { showSuccess, showError } = useToast();

    if (!receivable) return null;
    const recCurrency = receivable.currency || 'USD';
    const pendingRaw = parseFloat(receivable.totalAmount) - parseFloat(receivable.paidAmount || 0);
    const pendingBalance = Math.max(0, Number(pendingRaw.toFixed(2)));
    const client = receivable.paymentNotice?.client || receivable.client;

    const handleSubmitClick = (e) => {
        e.preventDefault();
        const normalizedAmount = parseFloat(String(amount).replace(',', '.'));
        if (!normalizedAmount || normalizedAmount <= 0) return showError('Validación', 'El monto debe ser mayor a 0');
        if (normalizedAmount > pendingBalance + 0.000001) {
            setPendingAmount(normalizedAmount);
            setShowConfirm(true);
            return;
        }
        doSubmit(normalizedAmount);
    };

    const doSubmit = async (normalizedAmount) => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/receivables/${receivable.id}/payments`, {
                amount: normalizedAmount, method, currency: recCurrency, reference: reference || undefined, date: toLocalISOString(date), notes: notes || undefined,
            });
            showSuccess('¡Pago Registrado!', `Se abonaron ${formatCurrency(normalizedAmount, recCurrency)}`);
            onSuccess();
            onClose();
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo registrar el pago');
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    const overpaymentAmount = pendingAmount > 0 ? pendingAmount - pendingBalance : 0;

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-xl">
                                    <CreditCard className="text-green-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Registrar Pago</h3>
                                    <p className="text-xs text-slate-500">{client?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mx-6 mt-5 bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center border border-slate-100">
                            <div>
                                <p className="text-xs text-slate-400 mb-0.5">Total</p>
                                <p className="font-bold text-slate-700 text-sm">
                                    {formatCurrency(parseFloat(receivable.totalAmount), recCurrency)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-green-500 mb-0.5">Abonado</p>
                                <p className="font-bold text-green-600 text-sm">
                                    {formatCurrency(parseFloat(receivable.paidAmount || 0), recCurrency)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-amber-500 mb-0.5">Pendiente</p>
                                <p className="font-bold text-amber-600 text-sm">
                                    {formatCurrency(pendingBalance, recCurrency)}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitClick} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Monto a Abonar ({getCurrencySymbol(recCurrency)})</label>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary bg-slate-50">
                                    <span className="text-slate-400 font-medium text-sm">{getCurrencySymbol(recCurrency)}</span>
                                    <input type="number" step="0.01" min="0.01"
                                        value={amount} onChange={e => setAmount(e.target.value.replace(',', '.'))}
                                        className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                                        placeholder="0.00" required />
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
                                    rows={2} placeholder="Información adicional del pago..." />
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
                </div>,
                document.body
            )}

            {showConfirm && (
                <OverpaymentConfirmModal
                    amount={pendingAmount}
                    pendingBalance={pendingBalance}
                    overpaymentAmount={overpaymentAmount}
                    clientName={client?.name || 'N/A'}
                    loading={loading}
                    currency={recCurrency}
                    onConfirm={() => doSubmit(pendingAmount)}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
};

export default RegisterPaymentModal;
