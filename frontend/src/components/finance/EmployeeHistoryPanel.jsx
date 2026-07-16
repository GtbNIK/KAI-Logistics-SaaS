import { createPortal } from 'react-dom';
import { X, DollarSign, ArrowLeft, Calendar, CreditCard, Hash, FileText } from 'lucide-react';

const methodLabels = {
    TRANSFER: 'Transferencia',
    INTL_TRANSFER: 'Transf. Internacional',
    P_MOBILE: 'Pago Móvil',
    BINANCE_USDT: 'Binance USDT',
    ZELLE: 'Zelle',
    CASH_USD: 'Efectivo USD',
    OTHER: 'Otro',
};

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const EmployeeHistoryPanel = ({ user, payables, onClose, onRegisterPayment }) => {
    if (!user || typeof document === 'undefined') return null;

    const allPayments = [];
    payables
        .filter(p => p.employeeUserId === user.id)
        .forEach(p => {
            if (p.payments && p.payments.length > 0) {
                p.payments.forEach(pmt => {
                    allPayments.push({
                        ...pmt,
                        payableDescription: p.description,
                        payableStatus: p.status,
                        payableId: p.id,
                    });
                });
            }
        });

    allPayments.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const totalPaid = allPayments.reduce((sum, pmt) => sum + parseFloat(pmt.amount || 0), 0);
    const totalPending = payables
        .filter(p => p.employeeUserId === user.id && p.status !== 'PAID')
        .reduce((sum, p) => sum + (parseFloat(p.amount) - parseFloat(p.paidAmount || 0)), 0);

    return createPortal(
        <div className="fixed inset-0 z-[120] flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 z-10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Historial de Pagos</p>
                        <div className="w-9" />
                    </div>
                    <div className="px-6 pb-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-lg font-bold text-blue-700">
                                {user.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 text-base leading-tight">{user.name}</p>
                            <p className="text-xs text-slate-500">
                                {user.position || (user.role === 'ADMIN' ? 'Administrador' : 'Ventas')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Resumen */}
                <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Pagado</p>
                        <p className="text-lg font-bold text-blue-700">
                            ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{allPayments.length} pago(s)</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pendiente</p>
                        <p className="text-lg font-bold text-amber-700">
                            ${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            {payables.filter(p => p.employeeUserId === user.id && p.status !== 'PAID').length} cuenta(s)
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="px-5 mt-6 pb-8">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar size={12} />
                        Línea de Tiempo
                    </h4>

                    {allPayments.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                            <DollarSign size={32} className="opacity-30 mb-2" />
                            <p className="text-sm font-medium">Sin pagos registrados</p>
                            <p className="text-xs mt-1">Aún no se han registrado pagos a este empleado.</p>
                            <button
                                onClick={() => { onClose(); onRegisterPayment?.({ employeeUser: user }); }}
                                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20"
                            >
                                Registrar Primer Pago
                            </button>
                        </div>
                    ) : (
                        <div className="relative space-y-0">
                            {allPayments.map((pmt, i) => (
                                <div key={pmt.id} className="relative flex gap-4 pb-6 last:pb-0">
                                    {/* Línea vertical */}
                                    {i < allPayments.length - 1 && (
                                        <div className="absolute left-[17px] top-10 bottom-0 w-px bg-blue-200" />
                                    )}
                                    {/* Punto */}
                                    <div className="relative z-10 mt-1">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${
                                            pmt.payableStatus === 'PAID'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            <DollarSign size={14} />
                                        </div>
                                    </div>
                                    {/* Contenido */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-slate-800 text-sm truncate">
                                                ${parseFloat(pmt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md ${
                                                pmt.payableStatus === 'PAID'
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {pmt.payableStatus === 'PAID' ? 'Pagado' : pmt.payableStatus === 'PARTIALLY_PAID' ? 'Abonado' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {pmt.payableDescription}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={11} />
                                                {formatDate(pmt.date || pmt.createdAt)}
                                            </span>
                                            {pmt.method && (
                                                <span className="flex items-center gap-1">
                                                    <CreditCard size={11} />
                                                    {methodLabels[pmt.method] || pmt.method}
                                                </span>
                                            )}
                                            {pmt.reference && (
                                                <span className="flex items-center gap-1">
                                                    <Hash size={11} />
                                                    {pmt.reference}
                                                </span>
                                            )}
                                        </div>
                                        {pmt.notes && (
                                            <p className="text-[11px] text-slate-400 mt-1 italic flex items-center gap-1">
                                                <FileText size={10} />
                                                {pmt.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmployeeHistoryPanel;