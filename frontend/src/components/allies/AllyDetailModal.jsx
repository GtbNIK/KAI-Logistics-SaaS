import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Building, FileText, MapPin, DollarSign, Trash2, AlertTriangle, Ship, ArrowRight, Plane, Package } from 'lucide-react';
import allyService from '../../services/ally.service';
import rateService from '../../services/rate.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { toDateString, toVenezuelanFormat } from '../../utils/dateHelpers';
import { buildPortLookup, formatPortList } from '../../utils/locationFormatters';
import axios from 'axios';
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

/*
// Helper para obtener fecha de hoy en formato YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};
*/

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const AllyDetailModal = ({ isOpen, onClose, ally }) => {
    const { user } = useAuth();
    const [rates, setRates] = useState([]);
    const [loadingRates, setLoadingRates] = useState(false);
    const [tariffRates, setTariffRates] = useState([]);
    const [loadingTariffRates, setLoadingTariffRates] = useState(false);
    const [portCatalog, setPortCatalog] = useState([]);
    
    // Estado para confirmar eliminación de tarifa
    const [deleteRateModal, setDeleteRateModal] = useState({ open: false, rate: null });
    const [deletingRate, setDeletingRate] = useState(false);

    // Toast para notificaciones
    const toast = useToast();

    const portLookup = useMemo(() => buildPortLookup(portCatalog), [portCatalog]);

    const fetchPorts = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/ports?all=true`, { withCredentials: true });
            setPortCatalog(res.data.data || res.data || []);
        } catch (error) {
            console.error('Error loading ports for Ally detail:', error);
        }
    }, []);

    const fetchRates = useCallback(async () => {
        if (!ally?.id) return;
        setLoadingRates(true);
        try {
            const data = await allyService.getAllyRates(ally.id);
            setRates(data);
        } catch (error) {
            console.error('Error fetching rates:', error);
        } finally {
            setLoadingRates(false);
        }
    }, [ally?.id]);

    const fetchTariffRates = useCallback(async () => {
        if (!ally?.id) return;
        setLoadingTariffRates(true);
        try {
            const result = await rateService.getRatesByAlly(ally.id);
            setTariffRates(result.data || []);
        } catch (error) {
            console.error('Error fetching tariff rates:', error);
        } finally {
            setLoadingTariffRates(false);
        }
    }, [ally?.id]);

    useEffect(() => {
        if (isOpen && ally) {
            fetchRates();
            fetchTariffRates();
            fetchPorts();
        }
    }, [isOpen, ally, fetchRates, fetchTariffRates, fetchPorts]);

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

    //const validRates = rates.filter(isRateValid);
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
                                <p className="text-slate-800 font-medium">{ally.rifOrId ? ally.rifOrId : 'No especificado'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contacto</label>
                                <p className="text-slate-800">{ally.contactInfo ? ally.contactInfo : 'No especificado'}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin size={12} /> Dirección
                                </label>
                                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{ally.address ? ally.address : 'No Especificado'}</p>
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
                            </div>

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
                        {/* Tarifario (Nuevo Rate) */}
                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Package size={16} className="text-red-600" /> Tarifas del Tarifario
                                    {tariffRates.length > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded border border-slate-200">
                                            {tariffRates.filter(r => r.isActive).length} activa(s) / {tariffRates.length} total
                                        </span>
                                    )}
                                </h4>
                            </div>

                            {loadingTariffRates ? (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="w-6 h-6 border-2 border-slate-300 border-t-primary-light rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-sm">Cargando tarifas...</p>
                                </div>
                            ) : tariffRates.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No hay tarifas en el tarifario para este aliado</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Región</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">País</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Origen</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Destino</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Línea</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Venta 20HC</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Venta 40HC</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Validez</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {tariffRates.map(rate => {
                                                const isExpired = new Date(rate.validUntil) < new Date();
                                                const originPorts = rate.originPorts || [];
                                                const destinationPorts = rate.destinationPorts || [];
                                                const originLabel = formatPortList(originPorts, portLookup, { fallback: '-' });
                                                const destinationLabel = formatPortList(destinationPorts, portLookup, { fallback: '-' });
                                                const countryDisplay = rate.region === 'CHINA' ? 'China' : (rate.country?.name || '-');
                                                return (
                                                    <tr key={rate.id} className={`hover:bg-slate-50/50 ${isExpired ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <span className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                {rate.region === 'CHINA' ? '🇨🇳 China' : '🌎 Otros'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                                            {countryDisplay}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                                            {originLabel}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                                            {destinationLabel}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                                            {rate.shippingLine?.name || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-green-600">
                                                            ${parseFloat(rate.sale20HC || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-green-600">
                                                            ${parseFloat(rate.sale40HC || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded ${!isExpired ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                                {isExpired && <AlertTriangle size={12} />}
                                                                {toVenezuelanFormat(toDateString(rate.validUntil))}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {rate.isActive ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 font-medium">
                                                                    Activa
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-500">
                                                                    Inactiva
                                                                </span>
                                                            )}
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
