import { useState, useEffect, useMemo } from 'react';
import { X, Building, FileText, MapPin, Calendar, DollarSign, Plus, Trash2, Package, Map, AlertTriangle, Clock, Ship, ArrowRight, Anchor, Plane } from 'lucide-react';
import allyService from '../../services/ally.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

// Helper para verificar si una tarifa está vigente
const isRateValid = (rate) => {
    if (!rate.validUntil) return true; // Sin fecha = siempre válida
    return new Date(rate.validUntil) >= new Date();
};

// Helper para formatear fechas
const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr.split('T')[0] + 'T12:00:00');
    return date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper para obtener fecha de hoy en formato YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const AllyDetailModal = ({ isOpen, onClose, ally }) => {
    const { user } = useAuth();
    const [rates, setRates] = useState([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [showAddRate, setShowAddRate] = useState(false);
    const [zones, setZones] = useState([]);
    const [services, setServices] = useState([]);
    
    // Estado del formulario
    const [newRate, setNewRate] = useState({ 
        serviceId: '', 
        zoneId: '', 
        costPrice: '', 
        salePrice: '', 
        currency: 'USD',
        validUntil: '',
        originPort: '',
        destinationPort: '',
        shippingLine: ''
    });
    const [saving, setSaving] = useState(false);
    
    // Estado para confirmar eliminación de tarifa
    const [deleteRateModal, setDeleteRateModal] = useState({ open: false, rate: null });
    const [deletingRate, setDeletingRate] = useState(false);

    // Toast para notificaciones
    const toast = useToast();

    useEffect(() => {
        if (isOpen && ally) {
            fetchRates();
            fetchCatalogs();
        }
    }, [isOpen, ally]);

    const fetchRates = async () => {
        setLoadingRates(true);
        try {
            const data = await allyService.getAllyRates(ally.id);
            setRates(data);
        } catch (error) {
            console.error('Error fetching rates:', error);
        } finally {
            setLoadingRates(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [zonesData, servicesData] = await Promise.all([
                allyService.getZones(),
                allyService.getServices()
            ]);
            setZones(zonesData);
            setServices(servicesData);
        } catch (error) {
            console.error('Error fetching catalogs:', error);
        }
    };

    // Determinar si el servicio seleccionado requiere puertos en vez de zona (reactivo)
    const isLogisticsService = useMemo(() => {
        const selectedService = services.find(s => s.id === newRate.serviceId);
        return selectedService && ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(selectedService.type);
    }, [newRate.serviceId, services]);

    const handleAddRate = async () => {
        if (!newRate.serviceId || !newRate.costPrice || !newRate.salePrice) {
            toast.showError('Datos incompletos', 'Selecciona servicio y define precios');
            return;
        }

        // Validación de lógica de negocio
        if (parseFloat(newRate.salePrice) < parseFloat(newRate.costPrice)) {
            toast.showError('Error de precios', 'El precio de venta no puede ser menor al costo');
            return;
        }

        // Verificar si el servicio requiere puertos
        const selectedService = services.find(s => s.id === newRate.serviceId);
        const requiresPorts = selectedService && ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(selectedService.type);
        
        if (requiresPorts) {
            if (!newRate.originPort || !newRate.destinationPort) {
                toast.showError('Datos incompletos', 'Debes especificar puerto de origen y destino');
                return;
            }
        } else {
            // Si es servicio local (no logístico), podría requerir zona, pero lo dejamos opcional
        }

        setSaving(true);
        try {
            await allyService.upsertAllyRate(ally.id, newRate);
            setNewRate({ 
                serviceId: '', zoneId: '', costPrice: '', salePrice: '', 
                currency: 'USD', validUntil: '', originPort: '', destinationPort: '', shippingLine: '' 
            });
            setShowAddRate(false);
            fetchRates();
            toast.showSuccess('¡Tarifa agregada!', 'La tarifa se ha registrado correctamente');
        } catch (error) {
            console.error('Error adding rate:', error);
            toast.showError('Error al agregar tarifa', error.response?.data?.message || 'Revisa los datos');
        } finally {
            setSaving(false);
        }
    };

    const openDeleteRateConfirm = (rate) => setDeleteRateModal({ open: true, rate });

    const handleConfirmDeleteRate = async () => {
        if (!deleteRateModal.rate) return;
        setDeletingRate(true);
        try {
            await allyService.deleteAllyRate(ally.id, deleteRateModal.rate.id);
            setDeleteRateModal({ open: false, rate: null });
            fetchRates();
            toast.showSuccess('¡Tarifa eliminada!', 'La tarifa se ha eliminado correctamente');
        } catch (error) {
            console.error('Error deleting rate:', error);
            toast.showError('Error al eliminar', error.response?.data?.message || 'No se pudo eliminar la tarifa');
        } finally {
            setDeletingRate(false);
        }
    };

    if (!isOpen || !ally) return null;

    const validRates = rates.filter(isRateValid);
    const expiredRates = rates.filter(r => !isRateValid(r));

    return (
        <>
            <ConfirmDeleteModal
                isOpen={deleteRateModal.open}
                onClose={() => setDeleteRateModal({ open: false, rate: null })}
                onConfirm={handleConfirmDeleteRate}
                title="Eliminar Tarifa"
                message="¿Estás seguro de que deseas eliminar esta tarifa?"
                itemName={deleteRateModal.rate ? `${deleteRateModal.rate.service?.name}` : ''}
                loading={deletingRate}
            />

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Detalle del Aliado</h3>
                            <p className="text-sm text-slate-500">Información y tarifas</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        
                        {/* Header del Aliado */}
                        <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Building className="text-purple-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-bold text-slate-800">{ally.name}</h4>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${ally.isActive ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                        {ally.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">Código: {ally.internalCode}</p>
                            </div>
                        </div>

                        {/* Datos básicos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <FileText size={12} /> RIF / Cédula
                                </label>
                                <p className="text-slate-800 font-medium">{ally.rifOrId}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contacto</label>
                                <p className="text-slate-800">{ally.contactInfo}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} /> Dirección
                                </label>
                                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{ally.address}</p>
                            </div>
                        </div>

                        {/* Tarifas */}
                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign size={16} className="text-green-600" /> Tarifas Vigentes
                                    {expiredRates.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded border border-amber-200">
                                            {expiredRates.length} vencida{expiredRates.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </h4>
                                {user?.role === 'ADMIN' && (
                                    <button
                                        onClick={() => setShowAddRate(!showAddRate)}
                                        className="text-sm px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={16} /> Agregar Tarifa
                                    </button>
                                )}
                            </div>

                            {/* Formulario Agregar Tarifa */}
                            {showAddRate && (
                                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-slate-500 font-medium ml-1">Servicio *</label>
                                            <select
                                                value={newRate.serviceId}
                                                onChange={(e) => {
                                                    setNewRate({
                                                        ...newRate, 
                                                        serviceId: e.target.value,
                                                        // Limpiar campos dependientes al cambiar servicio
                                                        zoneId: '', originPort: '', destinationPort: '', shippingLine: ''
                                                    });
                                                }}
                                                className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {services.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {isLogisticsService ? (
                                            <>
                                                <div>
                                                    <label className="text-xs text-slate-500 font-medium ml-1">Puerto Origen *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. Miami"
                                                        value={newRate.originPort}
                                                        onChange={(e) => setNewRate({...newRate, originPort: e.target.value})}
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 font-medium ml-1">Puerto Destino *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. La Guaira"
                                                        value={newRate.destinationPort}
                                                        onChange={(e) => setNewRate({...newRate, destinationPort: e.target.value})}
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs text-slate-500 font-medium ml-1">Línea (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. Laser / Maersk"
                                                        value={newRate.shippingLine}
                                                        onChange={(e) => setNewRate({...newRate, shippingLine: e.target.value})}
                                                        className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="md:col-span-2">
                                                <label className="text-xs text-slate-500 font-medium ml-1">Zona (Opcional)</label>
                                                <select
                                                    value={newRate.zoneId}
                                                    onChange={(e) => setNewRate({...newRate, zoneId: e.target.value})}
                                                    className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                                >
                                                    <option value="">General</option>
                                                    {zones.map(z => (
                                                        <option key={z.id} value={z.id}>{z.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs text-slate-500 font-medium ml-1">Costo *</label>
                                            <input
                                                type="number" step="0.01" min="0" placeholder="0.00"
                                                value={newRate.costPrice}
                                                onChange={(e) => setNewRate({...newRate, costPrice: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium ml-1">Venta *</label>
                                            <input
                                                type="number" step="0.01" min="0" placeholder="0.00"
                                                value={newRate.salePrice}
                                                onChange={(e) => setNewRate({...newRate, salePrice: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium ml-1">Válida hasta</label>
                                            <input
                                                type="date"
                                                value={newRate.validUntil}
                                                min={getTodayDate()}
                                                onChange={(e) => setNewRate({...newRate, validUntil: e.target.value})}
                                                className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddRate}
                                                disabled={saving}
                                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {saving ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tabla de Tarifas */}
                            {loadingRates ? (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="w-6 h-6 border-2 border-slate-300 border-t-primary-light rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-sm">Cargando tarifas...</p>
                                </div>
                            ) : rates.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                    <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No hay tarifas registradas</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Servicio</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ruta / Zona</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Costo</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Venta</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Vigencia</th>
                                                {user?.role === 'ADMIN' && <th className="px-4 py-3 w-10"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rates.map(rate => {
                                                const valid = isRateValid(rate);
                                                const isRoute = rate.originPort && rate.destinationPort;
                                                return (
                                                    <tr key={rate.id} className={`hover:bg-slate-50/50 ${!valid ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-700">{rate.service?.name}</div>
                                                            <div className="text-xs text-slate-400">{rate.service?.code}</div>
                                                            {rate.shippingLine && (
                                                                <div className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                                                    {rate.service?.type === 'AIR' ? <Plane size={10} /> : <Ship size={10} />}
                                                                    Línea: {rate.shippingLine}
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
                                                        <td className="px-4 py-3 text-right font-medium text-slate-500">
                                                            ${parseFloat(rate.costPrice || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-green-600">
                                                            ${parseFloat(rate.salePrice || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {rate.validUntil ? (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${valid ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                                    {!valid && <AlertTriangle size={12} />}
                                                                    {valid ? formatDate(rate.validUntil) : 'Vencida'}
                                                                </span>
                                                            ) : <span className="text-xs text-slate-400">Sin límite</span>}
                                                        </td>
                                                        {user?.role === 'ADMIN' && (
                                                            <td className="px-4 py-3">
                                                                <button onClick={() => openDeleteRateConfirm(rate)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        )}
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
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AllyDetailModal;
