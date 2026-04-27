import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, X, DollarSign, Wallet, Clock, BadgeDollarSign, Plus, Printer, Trash2 } from 'lucide-react';
import { toVenezuelanFormat } from '../../utils/dateHelpers';
import PaymentReceiptPDFModal from './PaymentReceiptPDFModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import receivableService from '../../services/receivable.service';
import { useToast } from '../../context/ToastContext';

const paymentMethods = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    {value: 'INTL_TRANSFER', label: 'Transferencia Internacional'},
    {value: 'P_MOBILE', label: 'Pago Móvil'},
    {value: 'BINANCE_USDT', label: 'Binance (USDT)'},
    { value: 'ZELLE',    label: 'Zelle' },
    { value: 'CASH_USD', label: 'Efectivo USD' },
    { value: 'OTHER',    label: 'Otro' },
];

const ReceivableDetailModal = ({ receivable, onClose, onRegisterPayment, onPaymentDeleted }) => {
    const [data, setData] = useState(receivable);
    const [receiptPayment, setReceiptPayment] = useState(null);
    const [paymentToDelete, setPaymentToDelete] = useState(null);
    const [deletingPayment, setDeletingPayment] = useState(false);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        setData(receivable);
    }, [receivable]);

    if (!data) return null;
    const r = data;
    const pendingBalance = parseFloat(r.totalAmount) - parseFloat(r.paidAmount || 0);
    const client = r.paymentNotice?.client || r.client;

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;
        setDeletingPayment(true);
        try {
            const response = await receivableService.deletePayment(r.id, paymentToDelete.id);
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <TrendingUp className="text-primary" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-xl">
                                {client?.name || 'N/A'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                CXC-{String(r.number || 0).padStart(5, '0')} · Cuenta por Cobrar
                                {r.paymentNotice?.number ? ` · AVC-${String(r.paymentNotice.number).padStart(5, '0')}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-5">
                    {r.manualNotes && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Notas</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.manualNotes}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                            <DollarSign size={18} className="mx-auto text-slate-400 mb-1" />
                            <p className="text-xs text-slate-400 mb-0.5">Total</p>
                            <p className="font-bold text-slate-800 text-sm">
                                ${parseFloat(r.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                                ${parseFloat(r.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Historial de Pagos</h3>
                            {r.status !== 'PAID' && (
                                <button
                                    onClick={() => onRegisterPayment(r)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                                >
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
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {r.payments.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    {toVenezuelanFormat(p.date || p.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                    {paymentMethods.find(m => m.value === p.method)?.label || p.method}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{p.reference || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={p.notes || ''}>
                                                    {p.notes || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                    +${parseFloat(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {p.method === 'CASH_USD' && (
                                                            <button
                                                                onClick={() => setReceiptPayment(p)}
                                                                className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Generar Recibo de Pago"
                                                            >
                                                                <Printer size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setPaymentToDelete(p)}
                                                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar abono"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
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

            {/* Modal de Recibo de Pago PDF */}
            <PaymentReceiptPDFModal
                isOpen={!!receiptPayment}
                onClose={() => setReceiptPayment(null)}
                payment={receiptPayment}
                clientName={client?.name}
                receivableNumber={r.number}
            />

            <ConfirmDeleteModal
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={handleDeletePayment}
                loading={deletingPayment}
                title="Eliminar abono"
                message="¿Seguro que deseas eliminar este abono? Se ajustarán los montos de la cuenta."
                itemName={paymentToDelete ? `Pago de $${parseFloat(paymentToDelete.amount).toFixed(2)} registrado el ${toVenezuelanFormat(paymentToDelete.date || paymentToDelete.createdAt)}` : ''}
            />
        </div>,
        document.body
    );
};

export default ReceivableDetailModal;
