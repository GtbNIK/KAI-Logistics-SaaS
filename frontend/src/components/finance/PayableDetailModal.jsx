import { createPortal } from 'react-dom';
import { TrendingDown, X, DollarSign, Wallet, Clock, BadgeDollarSign, Plus } from 'lucide-react';
import { toVenezuelanFormat } from '../../utils/dateHelpers';

const paymentMethods = [
    { value: 'TRANSFER', label: 'Transferencia Bancaria' },
    { value: 'INTL_TRANSFER', label: 'Transferencia Internacional' },
    { value: 'P_MOBILE', label: 'Pago Móvil' },
    { value: 'BINANCE_USDT', label: 'Binance (USDT)' },
    { value: 'ZELLE', label: 'Zelle' },
    { value: 'CASH_USD', label: 'Efectivo USD' },
    { value: 'OTHER', label: 'Otro' },
];

const PayableDetailModal = ({ payable, onClose, onRegisterPayment }) => {
    if (!payable) return null;
    const p = payable;
    const pendingBalance = parseFloat(p.amount) - parseFloat(p.paidAmount || 0);
    const beneficiary = p.ally?.name || p.svcProvider?.name || 'N/A';
    const beneficiaryType = p.ally ? 'Aliado' : p.svcProvider ? 'Servicio' : '';

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
                        <div className="p-2 bg-red-50 rounded-xl">
                            <TrendingDown className="text-red-500" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-xl">
                                {beneficiary}
                            </h2>
                            <p className="text-xs text-slate-500">
                                CXP-{String(p.number || 0).padStart(5, '0')} · Cuenta por Pagar
                                {beneficiaryType ? ` · ${beneficiaryType}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-5">
                    {/* Descripción */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 mb-1">Descripción</p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.description}</p>
                    </div>

                    {/* Fecha límite */}
                    {p.dueDate && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-2">
                            <Clock size={14} className="text-orange-500 shrink-0" />
                            <span className="text-sm text-orange-700">
                                Vence: {toVenezuelanFormat(p.dueDate)}
                            </span>
                        </div>
                    )}

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
                                                <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={pay.notes || ''}>
                                                    {pay.notes || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                    +${parseFloat(pay.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
        </div>,
        document.body
    );
};

export default PayableDetailModal;
