import { useState, useEffect } from 'react';
import { X, Package, FileText, DollarSign, Building, MapPin, Ship, ArrowRight, Plane } from 'lucide-react';
import serviceService from '../../services/service.service';

// Mapeo de tipos de servicio
const serviceTypeLabels = {
    DOOR_TO_DOOR: 'Puerta a Puerta',
    FCL_20: 'Contenedor 20\'',
    FCL_40: 'Contenedor 40\'',
    FCL_40HC: 'Contenedor 40\' HC',
    LCL: 'Carga Suelta (LCL)',
    AIR: 'Aéreo',
    WAREHOUSE: 'Almacenaje',
    CUSTOMS: 'Aduana',
    OTHER: 'Otro'
};

const ServiceDetailModal = ({ isOpen, onClose, service }) => {
    const [serviceDetails, setServiceDetails] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && service?.id) {
            fetchServiceDetails();
        }
    }, [isOpen, service?.id]);

    const fetchServiceDetails = async () => {
        setLoading(true);
        try {
            const data = await serviceService.getService(service.id);
            setServiceDetails(data);
        } catch (error) {
            console.error('Error fetching service details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !service) return null;

    const rates = serviceDetails?.rates || [];

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-green-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl">
                            <Package className="text-green-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{service.name}</h3>
                            <p className="text-sm text-green-600 font-medium">Código: {service.code}</p>
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
                    
                    {/* Info básica */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Tipo de Servicio
                            </label>
                            <p className="text-slate-700 font-medium">
                                {serviceTypeLabels[service.type] || service.type}
                            </p>
                        </div>
                        {service.notes && (
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} /> Notas
                                </label>
                                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{service.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Tarifas asociadas */}
                    <div className="border-t border-slate-100 pt-6">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <DollarSign size={16} className="text-green-600" />
                            Tarifas de este Servicio
                            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                {rates.length}
                            </span>
                        </h4>

                        {loading ? (
                            <div className="text-center py-8 text-slate-400">
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin mx-auto"></div>
                                <p className="mt-2 text-sm">Cargando tarifas...</p>
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay tarifas asociadas a este servicio</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                <Building size={12} className="inline mr-1" /> Aliado
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                <MapPin size={12} className="inline mr-1" /> Ruta / Zona
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                                                <DollarSign size={12} className="inline mr-1" /> Costo
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                                                <DollarSign size={12} className="inline mr-1" /> Venta
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rates.map(rate => {
                                            const isRoute = rate.originPort && rate.destinationPort;
                                            return (
                                                <tr key={rate.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-slate-700">
                                                            {rate.ally?.name || 'Sin aliado'}
                                                        </span>
                                                        {rate.shippingLine && (
                                                            <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                                                {/* Mostrar avión si es aéreo, barco si es marítimo */}
                                                                {service.type === 'AIR' ? <Plane size={10} /> : <Ship size={10} />}
                                                                Línea:  {rate.shippingLine}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {isRoute ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium uppercase">
                                                                    Puerto Origen <ArrowRight size={10} /> Puerto Destino
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{rate.originPort}</span>
                                                                    <ArrowRight size={12} className="text-slate-400" />
                                                                    <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">{rate.destinationPort}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            rate.zone?.name || <span className="italic text-slate-400">General</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-medium text-slate-500">
                                                            ${parseFloat(rate.costPrice || 0).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="font-bold text-green-600">
                                                            ${parseFloat(rate.salePrice || 0).toFixed(2)}
                                                        </span>
                                                        <span className="text-xs text-slate-400 ml-1">{rate.currency}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceDetailModal;
