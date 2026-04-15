import { X, DollarSign, Ship, MapPin, Calendar, FileText } from 'lucide-react';

const RateDetailModal = ({ isOpen, onClose, rate }) => {
    if (!isOpen || !rate) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const isExpired = new Date(rate.validUntil) < new Date();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <DollarSign className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Detalle de Tarifa</h2>
                            <p className="text-sm text-slate-500">
                                {rate.originPort?.code} → {rate.destinationPort?.code}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Estado */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <span className="text-sm font-medium text-slate-700">Estado de la tarifa:</span>
                        {isExpired ? (
                            <span className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                                Expirada
                            </span>
                        ) : (
                            <span className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-semibold rounded-full">
                                Vigente
                            </span>
                        )}
                    </div>

                    {/* Información General */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                            <Ship size={18} />
                            Información General
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Aliado</label>
                                <p className="text-sm font-semibold text-slate-800">{rate.ally?.name}</p>
                                <p className="text-xs text-slate-500">{rate.ally?.internalCode}</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Línea Naviera</label>
                                <p className="text-sm font-semibold text-slate-800">
                                    {rate.shippingLine?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Región</label>
                                <p className="text-sm font-semibold text-slate-800">
                                    {rate.region === 'CHINA' ? 'China' : 'Otros Países'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">Días Libres</label>
                                <p className="text-sm font-semibold text-slate-800">{rate.freeDays} días</p>
                            </div>
                        </div>
                    </div>

                    {/* Ruta */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                            <MapPin size={18} />
                            Ruta
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <label className="text-xs text-blue-600 font-medium">Puerto de Salida</label>
                                <p className="text-sm font-semibold text-slate-800 mt-1">
                                    {rate.originPort?.name}
                                </p>
                                <p className="text-xs text-slate-500">{rate.originPort?.code}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <label className="text-xs text-green-600 font-medium">Puerto de Llegada</label>
                                <p className="text-sm font-semibold text-slate-800 mt-1">
                                    {rate.destinationPort?.name}
                                </p>
                                <p className="text-xs text-slate-500">{rate.destinationPort?.code}</p>
                            </div>
                        </div>
                    </div>

                    {/* Precios */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                            <DollarSign size={18} />
                            Precios
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <label className="text-xs text-green-600 font-medium">Venta 20HC</label>
                                <p className="text-2xl font-bold text-green-700 mt-1">
                                    ${rate.sale20HC?.toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Costo: ${rate.cost20ft?.toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <label className="text-xs text-green-600 font-medium">Venta 40HC</label>
                                <p className="text-2xl font-bold text-green-700 mt-1">
                                    ${rate.sale40HC?.toFixed(2)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Costo: ${rate.cost40ft?.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Fees y Márgenes */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Fees y Márgenes</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <label className="text-xs text-slate-500 font-medium">Bank Fee</label>
                                <p className="text-lg font-semibold text-slate-800 mt-1">
                                    ${rate.bankFee?.toFixed(2)}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <label className="text-xs text-slate-500 font-medium">Profit Yaho</label>
                                <p className="text-lg font-semibold text-slate-800 mt-1">
                                    ${rate.profitYaho?.toFixed(2)}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <label className="text-xs text-slate-500 font-medium">Profit IS</label>
                                <p className="text-lg font-semibold text-slate-800 mt-1">
                                    ${rate.profitIS?.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Validez */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                            <Calendar size={18} />
                            Validez
                        </h3>
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-sm text-slate-700">
                                Válida hasta: <span className="font-semibold">{formatDate(rate.validUntil)}</span>
                            </p>
                        </div>
                    </div>

                    {/* Observaciones */}
                    {rate.observations && (
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
                                <FileText size={18} />
                                Observaciones
                            </h3>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{rate.observations}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateDetailModal;
