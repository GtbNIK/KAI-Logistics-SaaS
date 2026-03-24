import { createPortal } from 'react-dom';
import { X, Container, Package, Ship, MapPin, Calendar, User, FileText, Anchor, Navigation } from 'lucide-react';

const STATUS_LABELS = {
    PENDING:             'Pendiente',
    AT_ORIGIN_WAREHOUSE: 'En Almacén Origen',
    ON_VESSEL:           'En Tránsito',
    AT_DESTINATION_PORT: 'En Puerto Destino',
    CUSTOMS_CLEARANCE:   'En Aduana',
    DELIVERED:           'Entregado',
};

const STATUS_COLORS = {
    PENDING:             'bg-amber-50 text-amber-600 border-amber-200',
    AT_ORIGIN_WAREHOUSE: 'bg-orange-50 text-orange-600 border-orange-200',
    ON_VESSEL:           'bg-blue-50 text-blue-600 border-blue-200',
    AT_DESTINATION_PORT: 'bg-purple-50 text-purple-600 border-purple-200',
    CUSTOMS_CLEARANCE:   'bg-pink-50 text-pink-600 border-pink-200',
    DELIVERED:           'bg-green-50 text-green-600 border-green-200',
};

const ShipmentDetailModal = ({ shipment, onClose, onEdit }) => {
    if (!shipment) return null;
    const s = shipment;
    const isFCL = s.type === 'FCL';

    // Fix desfase: parsear YYYY-MM-DD como fecha local, no UTC
    const formatDate = (d) => {
        if (!d) return '—';
        // Si ya es solo una fecha (YYYY-MM-DD), parsear manualmente para evitar UTC offset
        const dateStr = typeof d === 'string' ? d.slice(0, 10) : d;
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            const local = new Date(year, month - 1, day);
            return local.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const InfoRow = ({ icon: Icon, label, value, mono }) => (
        <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                <p className={`text-sm text-slate-700 font-medium truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
            </div>
        </div>
    );

    const shippingLineName = s.shippingLineRel?.name || s.shippingLine || null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isFCL ? 'bg-indigo-50' : 'bg-teal-50'}`}>
                            {isFCL
                                ? <Container className="text-indigo-600" size={22} />
                                : <Package className="text-teal-600" size={22} />
                            }
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg">
                                EMB-{String(s.number || 0).padStart(5, '0')}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {isFCL ? 'Full Container Load' : 'Door to Door'} · {s.clientName || s.clientRel?.name || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${STATUS_COLORS[s.status] || ''}`}>
                            {STATUS_LABELS[s.status] || s.status}
                        </span>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 space-y-5">

                    {s.currentLocation && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                            <Navigation size={14} className="text-blue-500 shrink-0" />
                            <span className="text-sm text-blue-700">{s.currentLocation}</span>
                        </div>
                    )}

                    {/* Layout de 2 columnas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Columna izquierda: Info general */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Información General
                            </h3>
                            <InfoRow icon={FileText} label="Nro. BL" value={s.blNumber} mono />
                            {isFCL && <InfoRow icon={FileText} label="Nro. Booking" value={s.bookingNumber} mono />}
                            <InfoRow icon={Anchor} label="Línea Naviera" value={shippingLineName} />
                            <InfoRow icon={User} label="Cliente" value={s.clientName || s.clientRel?.name} />
                            <InfoRow icon={User} label="Vendedor" value={s.vendedor?.name} />
                            {s.paymentNotice && (
                                <InfoRow icon={FileText} label="Aviso de Cobro"
                                    value={`AVC-${String(s.paymentNotice.number || 0).padStart(5, '0')}`} />
                            )}
                        </div>

                        {/* Columna derecha: Datos específicos de tipo */}
                        {isFCL ? (
                            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
                                    Datos FCL
                                </h3>
                                <InfoRow icon={Container} label="Contenedor" value={
                                    s.containerType
                                        ? `${s.containerType}${s.containerQty ? ` × ${s.containerQty}` : ''}`
                                        : null
                                } />
                                <InfoRow icon={MapPin} label="Puerto Origen" value={s.originPort} />
                                <InfoRow icon={MapPin} label="Puerto Destino" value={s.destPort} />
                                <InfoRow icon={Calendar} label="ETD — Salida estimada" value={formatDate(s.etd)} />
                                <InfoRow icon={Calendar} label="ETA — Llegada estimada" value={formatDate(s.eta)} />
                            </div>
                        ) : (
                            <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100">
                                <h3 className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-3">
                                    Datos Door to Door
                                </h3>
                                <InfoRow icon={MapPin} label="Puerto Origen" value={s.originPort} />
                                <InfoRow icon={Package} label="Peso (kg)" value={s.weight ? `${parseFloat(s.weight)} kg` : null} />
                                <InfoRow icon={Package} label="Cantidad" value={s.quantity} />
                                <InfoRow icon={Package} label="CBM" value={s.cbm ? parseFloat(s.cbm) : null} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                        Cerrar
                    </button>
                    <button onClick={onEdit}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-sky-600/20 transition-all active:scale-95">
                        Editar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShipmentDetailModal;
