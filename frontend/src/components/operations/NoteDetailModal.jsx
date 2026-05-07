import { createPortal } from 'react-dom';
import { ScrollText, Package, User, Calendar, MapPin, X } from 'lucide-react';

const STATUS_MAP = {
    DRAFT:      { label: 'Borrador',   color: 'bg-slate-100 text-slate-600' },
    DISPATCHED: { label: 'Despachada', color: 'bg-blue-100 text-blue-600' },
    DELIVERED:  { label: 'Entregada',  color: 'bg-green-100 text-green-600' },
    CANCELLED:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
};

const NoteDetailModal = ({ note, onClose }) => {
    if (!note) return null;
    const n = note;
    const statusCfg = STATUS_MAP[n.status] || STATUS_MAP.DRAFT;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <ScrollText className="text-emerald-600" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                NDE-{String(n.number).padStart(5, '0')}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Info general */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <User className="text-slate-400 mt-0.5" size={18} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Cliente</p>
                                <p className="font-medium text-slate-800">{n.client?.name || 'N/A'}</p>
                                {n.client?.rifOrId && (
                                    <p className="text-xs text-slate-500">{n.client.rifOrId}</p>
                                )}
                                {n.client?.address && (
                                    <p className="text-xs text-slate-500 break-words whitespace-pre-line mt-1">
                                        Dirección: {n.client.address}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <Calendar className="text-slate-400 mt-0.5" size={18} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Fecha</p>
                                <p className="font-medium text-slate-800">
                                    {new Date(n.date).toLocaleDateString('es-VE')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <MapPin className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Número de WareHouse</p>
                                <p className="font-medium text-slate-800">{n.warehouseNumber}</p>
                            </div>
                        </div>

                        {n.deliveredTo && (
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <User className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Recibido por</p>
                                <p className="font-medium text-slate-800">{n.deliveredTo}</p>
                            </div>
                        </div>
                    )}
                    </div>

                    {n.deliveryAddress && (
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3 min-w-0">
                            <MapPin className="text-slate-400 mt-0.5 shrink-0" size={16} />
                            <div className="min-w-0">
                                <p className="text-xs text-slate-400 mb-1">Dirección de entrega</p>
                                <p className="font-medium text-slate-800 break-words whitespace-pre-wrap">{n.deliveryAddress}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    {n.items && n.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Package size={14} /> Servicios / Items
                            </p>
                            <div className="space-y-2">
                                {n.items.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{item.description}</p>
                                            <p className="text-xs text-slate-400">
                                                Cant.: {Number(item.quantity)}
                                            </p>
                                            {item.weight != null && item.weight !== '' && (
                                                <p className="text-xs text-slate-400">Peso: {Number(item.weight).toFixed(2)} KG</p>
                                            )}
                                            {item.cbm != null && item.cbm !== '' && (
                                                <p className="text-xs text-slate-400">CBM: {Number(item.cbm).toFixed(3)}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {n.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-amber-600 mb-1">Notas</p>
                            <p className="text-sm text-slate-700">{n.notes}</p>
                        </div>
                    )}

                </div>
            </div>
        </div>,
        document.body
    );
};

export default NoteDetailModal;
