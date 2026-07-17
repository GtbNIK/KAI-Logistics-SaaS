import { createPortal } from 'react-dom';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const OverpaymentConfirmModal = ({ amount, pendingBalance, overpaymentAmount, clientName, loading, onConfirm, onCancel, currency = 'USD' }) => (
    createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onCancel}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <AlertTriangle className="text-amber-600" size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">Confirmar Sobrepago</h3>
                    </div>
                    <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-700">
                        Estás a punto de registrar un abono de <strong>{formatCurrency(amount, currency)}</strong> que supera el saldo pendiente de <strong>{formatCurrency(pendingBalance, currency)}</strong>.
                    </p>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                            <div className="text-sm text-amber-800">
                                <p className="font-semibold mb-1">Se generará un saldo a favor</p>
                                <p>
                                    <strong>{formatCurrency(overpaymentAmount, currency)}</strong> se acreditarán como saldo a favor de <strong>{clientName}</strong> y se aplicarán automáticamente a su próxima cuenta por cobrar.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onCancel}
                            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="button" onClick={onConfirm} disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm">
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Plus size={16} />
                            }
                            Confirmar Sobrepago
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
);

export default OverpaymentConfirmModal;