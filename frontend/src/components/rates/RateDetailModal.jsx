import { X, DollarSign, Ship, MapPin, Calendar, FileText, Anchor, Clock, AlertCircle } from 'lucide-react';

const RateDetailModal = ({ isOpen, onClose, rate }) => {
    if (!isOpen || !rate) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr.split('T')[0] + 'T12:00:00');
        return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const isExpired = rate.validUntil && new Date(rate.validUntil) < new Date();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-xl">
                            <DollarSign className="text-red-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {rate.originPort?.code} → {rate.destinationPort?.code}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${
                                    isExpired
                                        ? 'bg-red-50 text-red-600 border-red-100'
                                        : 'bg-green-50 text-green-600 border-green-100'
                                }`}>
                                    {isExpired ? 'Expirada' : 'Vigente'}
                                </span>
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-md border ${
                                    rate.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>{rate.isActive ? 'Activa' : 'Inactiva'}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Sección: Información General */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Ship size={14} /> Información General
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Aliado</p>
                                <p className="font-medium text-slate-800">{rate.ally?.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{rate.ally?.internalCode}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Anchor className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Línea Naviera</p>
                                    <p className="font-medium text-slate-800">{rate.shippingLine?.name || '—'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Región</p>
                                <p className="font-medium text-slate-800">
                                    {rate.region === 'CHINA' ? 'China' : 'Otros Países'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                                <Clock className="text-slate-400 mt-0.5" size={18} />
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Días Libres</p>
                                    <p className="font-medium text-slate-800">{rate.freeDays} días</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección: Ruta */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={14} /> Ruta
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-500 mb-1">Puerto de Salida</p>
                                <p className="font-medium text-slate-800">{rate.originPort?.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{rate.originPort?.code}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs text-emerald-500 mb-1">Puerto de Llegada</p>
                                <p className="font-medium text-slate-800">{rate.destinationPort?.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{rate.destinationPort?.code}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sección: Precios de Venta */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Precios
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-xs text-green-600 mb-1">Venta 20HC</p>
                                <p className="text-2xl font-bold text-green-700">${rate.sale20HC?.toFixed(2)}</p>
                                <p className="text-xs text-slate-500 mt-1">Costo: ${rate.cost20ft?.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-xs text-green-600 mb-1">Venta 40HC</p>
                                <p className="text-2xl font-bold text-green-700">${rate.sale40HC?.toFixed(2)}</p>
                                <p className="text-xs text-slate-500 mt-1">Costo: ${rate.cost40ft?.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sección: Fees y Márgenes */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <DollarSign size={14} /> Fees y Márgenes
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Bank Fee</p>
                                <p className="text-lg font-bold text-slate-800">${rate.bankFee?.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Profit Yaho</p>
                                <p className="text-lg font-bold text-slate-800">${rate.profitYaho?.toFixed(2)}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1">Profit IS</p>
                                <p className="text-lg font-bold text-slate-800">${rate.profitIS?.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sección: Validez */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Calendar size={14} /> Validez
                        </h4>
                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                            isExpired
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                        }`}>
                            {isExpired && <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />}
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Válida hasta</p>
                                <p className="font-medium text-slate-800">{formatDate(rate.validUntil)}</p>
                            </div>
                        </div>
                    </div>

                    
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="ml-auto px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateDetailModal;
