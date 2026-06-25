import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingDown, X, DollarSign, Wallet, Clock, BadgeDollarSign, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toVenezuelanFormat, getTodayLocal } from '../../utils/dateHelpers';
import payableService from '../../services/payable.service';
import { useToast } from '../../context/ToastContext';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

const paymentMethods = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    { value: 'INTL_TRANSFER', label: 'Transferencia Internacional' },
    { value: 'P_MOBILE', label: 'Pago Móvil' },
    { value: 'BINANCE_USDT', label: 'Binance (USDT)' },
    { value: 'ZELLE', label: 'Zelle' },
    { value: 'CASH_USD', label: 'Efectivo USD' },
    { value: 'OTHER', label: 'Otro' },
];

const PayableDetailModal = ({ payable, onClose, onRegisterPayment, onPaymentDeleted }) => {
    const [data, setData] = useState(payable);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [deletingPayment, setDeletingPayment] = useState(false);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        setData(payable);
    }, [payable]);

    if (!data) return null;
    const p = data;
    const pendingBalance = parseFloat(p.amount) - parseFloat(p.paidAmount || 0);
    const beneficiary = p.ally?.name || p.svcProvider?.name || 'N/A';
    const beneficiaryType = p.ally ? 'Aliado' : p.svcProvider ? 'Servicio' : '';

    // Verificar si la fecha límite pasó
    const isOverdue = p.dueDate ? (() => {
        const today = getTodayLocal();
        const dueDate = new Date(p.dueDate);
        const todayDate = new Date(today);
        dueDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        return dueDate < todayDate;
    })() : false;

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;
        setDeletingPayment(true);
        try {
            const response = await payableService.deletePayment(p.id, paymentToDelete.id);
            const updated = response.data?.data || response.data;
            setData(updated);
            onPaymentDeleted?.();
            showSuccess('Pago eliminado', 'El abono fue eliminado correctamente');
            setPaymentToDelete(null);
        } catch (error) {
            showError('Error', error.response?.data?.message || 'No se pudo eliminar el pago');
        } finally {
            setDeletingPayment(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className={`flex items-center justify-between px-6 py-4 border-b ${isOverdue ? 'border-red-200 bg-red-100' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isOverdue ? 'bg-red-200' : 'bg-red-50'}`}>
                            <TrendingDown className={isOverdue ? 'text-red-700' : 'text-red-500'} size={22} />
                        </div>
                        <div>
                            <h2 className={`font-bold text-xl ${isOverdue ? 'text-red-800' : 'text-slate-800'}`}>
                                {beneficiary}
                            </h2>
                            <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
                                CXP-{String(p.number || 0).padStart(5, '0')} · Cuenta por Pagar
                                {beneficiaryType ? ` · ${beneficiaryType}` : ''}
                            </p>
                        </div>
                    </div>
                    {isOverdue && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                            <AlertTriangle size={12} />
                            <span>ESTA CUENTA POR PAGAR PASÓ SU FECHA LÍMITE</span>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-5">
                    {/* Descripción */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Descripción</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap truncate break-words">{p.description}</p>
                    </div>

                    {/* Factura y fecha límite */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Nro. Factura</p>
                            <p className="text-sm text-slate-700 font-medium">
                                {p.invoiceNr?.trim() ? p.invoiceNr : '(Sin numero de factura)'}
                            </p>
                        </div>
                        <div className={`rounded-xl p-3 flex items-center gap-2 border ${p.dueDate ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                            <Clock size={14} className={p.dueDate ? 'text-orange-500' : 'text-slate-400'} />
                            <span className={`text-sm ${p.dueDate ? 'text-orange-700' : 'text-slate-500'}`}>
                                {p.dueDate ? `Vence: ${toVenezuelanFormat(p.dueDate)}` : 'Sin fecha de vencimiento'}
                            </span>
                        </div>
                    </div>

                    {/* Cards de montos */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <DollarSign size={18} className="mx-auto text-slate-400 mb-1" />
                            <p className="text-xs text-slate-400 mb-0.5">Total</p>
                            <p className="font-bold text-slate-800 text-sm">
                                ${parseFloat(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                            <Clock size={18} className="mx-auto text-amber-500 mb-1" />
                            <p className="text-xs text-amber-500 mb-0.5">Pendiente</p>
                            <p className="font-bold text-amber-700 text-sm">
                                ${pendingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                            <Wallet size={18} className="mx-auto text-green-500 mb-1" />
                            <p className="text-xs text-green-500 mb-0.5">Pagado</p>
                            <p className="font-bold text-green-700 text-sm">
                                ${parseFloat(p.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Historial de pagos */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Historial de Pagos</h3>
                            {p.status !== 'PAID' && (
                                <button
                                    onClick={() => onRegisterPayment(p)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
                                    <Plus size={14} /> Registrar Pago
                                </button>
                            )}
                        </div>
                        {(!p.payments || p.payments.length === 0) ? (
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
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {p.payments.map((pay, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    {toVenezuelanFormat(pay.date || pay.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {paymentMethods.find(m => m.value === pay.method)?.label || pay.method}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{pay.reference || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[100px] truncate break-words whitespace-pre-wrap" title={pay.notes || ''}>
                                                    {pay.notes || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                    +${parseFloat(pay.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setPaymentToDelete(pay)}
                                                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar abono"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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
            <ConfirmDeleteModal
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={handleDeletePayment}
                loading={deletingPayment}
                title="Eliminar abono"
                message="¿Seguro que deseas eliminar este pago? Se actualizarán los montos de la cuenta."
                itemName={paymentToDelete ? `Pago de $${parseFloat(paymentToDelete.amount).toFixed(2)} registrado el ${toVenezuelanFormat(paymentToDelete.date || paymentToDelete.createdAt)}` : ''}
            />
        </div>,
        document.body
    );
};

export default PayableDetailModal;
