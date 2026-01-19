import { useState, useEffect } from 'react';
import { X, Building, FileText, MapPin, Calendar, DollarSign, Plus, Trash2, Package, Map, AlertTriangle, Clock } from 'lucide-react';
import allyService from '../../services/ally.service';
import { useAuth } from '../../context/AuthContext';

// Helper para verificar si una tarifa está vigente
const isRateValid = (rate) => {
    if (!rate.validUntil) return true; // Sin fecha = siempre válida
    return new Date(rate.validUntil) >= new Date();
};

// Helper para formatear fechas (corrige problema de timezone)
const formatDate = (dateStr) => {
    if (!dateStr) return null;
    // Agregar 'T12:00:00' para evitar problemas de timezone
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
    const [newRate, setNewRate] = useState({ 
        serviceId: '', 
        zoneId: '', 
        price: '', 
        currency: 'USD',
        validUntil: '' 
    });
    const [saving, setSaving] = useState(false);

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

    const handleAddRate = async () => {
        if (!newRate.serviceId || !newRate.price) {
            alert('Selecciona un servicio y precio');
            return;
        }
        setSaving(true);
        try {
            await allyService.upsertAllyRate(ally.id, newRate);
            setNewRate({ serviceId: '', zoneId: '', price: '', currency: 'USD', validUntil: '' });
            setShowAddRate(false);
            fetchRates();
        } catch (error) {
            console.error('Error adding rate:', error);
            alert('Error al agregar tarifa');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRate = async (rateId) => {
        if (!confirm('¿Eliminar esta tarifa?')) return;
        try {
            await allyService.deleteAllyRate(ally.id, rateId);
            fetchRates();
        } catch (error) {
            console.error('Error deleting rate:', error);
            alert('Error al eliminar tarifa');
        }
    };

    if (!isOpen || !ally) return null;

    // Separar tarifas vigentes y vencidas
    const validRates = rates.filter(isRateValid);
    const expiredRates = rates.filter(r => !isRateValid(r));

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Detalle del Aliado</h3>
                        <p className="text-sm text-slate-500">Información y tarifas</p>
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
                    
                    {/* Header del Aliado */}
                    <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Building className="text-purple-600" size={24} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h4 className="text-lg font-bold text-slate-800">{ally.name}</h4>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    ally.isActive 
                                        ? 'bg-green-50 text-green-600 border border-green-100' 
                                        : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                    {ally.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{ally.internalCode}</p>
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
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Contacto
                            </label>
                            <p className="text-slate-800">{ally.contactInfo}</p>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={12} /> Dirección
                            </label>
                            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{ally.address}</p>
                        </div>
                    </div>

                    {/* Sección de Tarifas */}
                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={16} className="text-green-600" />
                                Tarifas por Zona y Servicio
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
                                    <Plus size={16} />
                                    Agregar Tarifa
                                </button>
                            )}
                        </div>

                        {/* Formulario para agregar tarifa */}
                        {showAddRate && (
                            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500">Servicio *</label>
                                        <select
                                            value={newRate.serviceId}
                                            onChange={(e) => setNewRate({...newRate, serviceId: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {services.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Zona</label>
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
                                    <div>
                                        <label className="text-xs text-slate-500">Precio (USD) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="0.00"
                                            value={newRate.price}
                                            onChange={(e) => setNewRate({...newRate, price: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500">Válida hasta: (opcional)</label>
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
                                <p className="text-xs text-slate-400">
                                    💡 Si no defines fecha, la tarifa no expirará automáticamente.
                                </p>
                            </div>
                        )}

                        {/* Tabla de tarifas */}
                        {loadingRates ? (
                            <div className="text-center py-8 text-slate-400">
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-primary-light rounded-full animate-spin mx-auto"></div>
                                <p className="mt-2 text-sm">Cargando tarifas...</p>
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay tarifas registradas</p>
                                <p className="text-xs mt-1">Haz clic en "Agregar Tarifa" para comenzar</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                <Package size={12} className="inline mr-1" /> Servicio
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                <Map size={12} className="inline mr-1" /> Zona
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                                                <DollarSign size={12} className="inline mr-1" /> Precio
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                                                <Clock size={12} className="inline mr-1" /> Vigencia
                                            </th>
                                            {user?.role === 'ADMIN' && (
                                                <th className="px-4 py-3 w-10"></th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rates.map(rate => {
                                            const valid = isRateValid(rate);
                                            return (
                                                <tr key={rate.id} className={`hover:bg-slate-50/50 ${!valid ? 'bg-red-50/30' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-medium ${valid ? 'text-slate-700' : 'text-slate-400'}`}>
                                                            {rate.service?.name}
                                                        </span>
                                                        <span className="text-xs text-slate-400 ml-2">({rate.service?.code})</span>
                                                    </td>
                                                    <td className={`px-4 py-3 ${valid ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        {rate.zone?.name || <span className="italic">General</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className={`font-bold ${valid ? 'text-green-600' : 'text-slate-400 line-through'}`}>
                                                            ${parseFloat(rate.price).toFixed(2)}
                                                        </span>
                                                        <span className="text-xs text-slate-400 ml-1">{rate.currency}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {rate.validUntil ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${
                                                                valid 
                                                                    ? 'bg-blue-50 text-blue-600' 
                                                                    : 'bg-red-50 text-red-600'
                                                            }`}>
                                                                {!valid && <AlertTriangle size={12} />}
                                                                {valid ? `Hasta ${formatDate(rate.validUntil)}` : 'Vencida'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Sin límite</span>
                                                        )}
                                                    </td>
                                                    {user?.role === 'ADMIN' && (
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => handleDeleteRate(rate.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Eliminar"
                                                            >
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

                    {/* Nota sobre cotizaciones */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="text-blue-600" size={16} />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-blue-800">Sobre la validez de cotizaciones</p>
                                <p className="text-blue-600 mt-1">
                                    Las cotizaciones creadas antes de que una tarifa expire <strong>mantienen el precio original </strong> 
                                    durante su período de validez (definido al crear la cotización).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Metadatos */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar size={12} />
                            <span>Registrado el {new Date(ally.createdAt).toLocaleDateString('es-VE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
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

export default AllyDetailModal;
