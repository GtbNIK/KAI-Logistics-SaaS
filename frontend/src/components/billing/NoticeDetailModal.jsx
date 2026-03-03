import { createPortal } from 'react-dom';
import { Receipt, DollarSign, Package, FileText, User, Calendar, X, ScrollText } from 'lucide-react';

const NoticeDetailModal = ({ notice, onClose }) => {
    if (!notice) return null;
    const n = notice;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Receipt className="text-primary" size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-xl">
                                AVC-{String(n.number).padStart(5, '0')}
                            </h2>
                            <p className="text-slate-500 text-sm">Aviso de Cobro</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <User size={12} /> Cliente
                            </p>
                            <p className="font-semibold text-slate-800">{n.client?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-400">{n.client?.rifOrId || ''}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={12} /> Fecha de Emisión
                            </p>
                            <p className="font-semibold text-slate-800">
                                {new Date(n.issueDate || n.createdAt).toLocaleDateString('es-VE')}
                            </p>
                        </div>
                    </div>

                    {n.quote && (
                        <div className="flex items-center gap-2 text-sm bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                            <FileText size={14} className="text-blue-400" />
                            <span className="text-slate-600">
                                Originado desde:{' '}
                                <span className="font-semibold text-blue-700">
                                    COT-{String(n.quote.number).padStart(5, '0')}
                                </span>
                            </span>
                        </div>
                    )}

                    {n.deliveryNote && (
                        <div className="flex items-center gap-2 text-sm bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
                            <ScrollText size={14} className="text-emerald-500" />
                            <span className="text-slate-600">
                                Originado desde Nota de Entrega:{' '}
                                <span className="font-semibold text-emerald-700">
                                    NDE-{String(n.deliveryNote.number).padStart(5, '0')}
                                </span>
                            </span>
                        </div>
                    )}

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Servicios Cobrados
                        </h3>
                        {(!n.items || n.items.length === 0) ? (
                            <div className="flex flex-col items-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <Package size={28} className="opacity-30 mb-2" />
                                <p className="text-sm">Sin items registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {n.items.map((item, i) => {
                                    const parts = (item.description || '').split(' · ');
                                    const serviceName = parts[0] || 'Servicio';
                                    const extraParts = parts.slice(1);
                                    return (
                                        <div key={i} className="bg-slate-50 rounded-xl p-4 flex justify-between items-start border border-slate-100">
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-800">{serviceName}</p>
                                                <div className="text-sm text-slate-500 flex flex-col gap-0.5">
                                                    {extraParts.map((part, j) => (
                                                        <p key={j} className="flex items-center gap-1">
                                                            <span className="font-medium text-slate-600">{part.split(': ')[0]}:</span>{' '}
                                                            {part.split(': ').slice(1).join(': ')}
                                                        </p>
                                                    ))}
                                                    <p className="text-slate-400 text-xs mt-1 italic">
                                                        {parseFloat(item.quantity)} unidades @ ${parseFloat(item.unitPrice || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-slate-700 whitespace-nowrap ml-4">
                                                ${parseFloat(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {n.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-amber-600 mb-1">Notas</p>
                            <p className="text-sm text-slate-700">{n.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer total */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-800 text-white flex items-center justify-between rounded-b-2xl">
                    <span className="text-sm font-medium flex items-center gap-2">
                        <DollarSign size={16} /> Total del Aviso
                    </span>
                    <span className="text-2xl font-bold">
                        ${parseFloat(n.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NoticeDetailModal;
