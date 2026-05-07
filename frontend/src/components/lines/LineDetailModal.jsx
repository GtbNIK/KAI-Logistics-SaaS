import { useState, useEffect, useMemo, useCallback } from 'react';
import { Ship, Plane, X, Hash, Package, ArrowRight, AlertTriangle } from 'lucide-react';
import rateService from '../../services/rate.service';
import { toDateString, toVenezuelanFormat } from '../../utils/dateHelpers';
import { buildPortLookup, formatPortList } from '../../utils/locationFormatters';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const LineDetailModal = ({ isOpen, onClose, item, type }) => {
    const [tariffRates, setTariffRates] = useState([]);
    const [loadingTariffRates, setLoadingTariffRates] = useState(false);
    const [portCatalog, setPortCatalog] = useState([]);

    const portLookup = useMemo(() => buildPortLookup(portCatalog), [portCatalog]);

    const fetchPorts = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/ports?all=true`, { withCredentials: true });
            setPortCatalog(res.data.data || res.data || []);
        } catch (error) {
            console.error('Error loading ports for Line detail:', error);
        }
    }, []);

    const fetchTariffRates = useCallback(async () => {
        if (!item?.id) return;
        setLoadingTariffRates(true);
        try {
            const result = await rateService.getRatesByShippingLine(item.id);
            setTariffRates(result.data || []);
        } catch (error) {
            console.error('Error fetching tariff rates:', error);
        } finally {
            setLoadingTariffRates(false);
        }
    }, [item?.id]);

    useEffect(() => {
        if (isOpen && item?.id && type === 'shipping') {
            fetchTariffRates();
            fetchPorts();
        } else {
            setTariffRates([]);
        }
    }, [isOpen, item?.id, type, fetchTariffRates, fetchPorts]);

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${type === 'shipping' ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
                <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 ${
                    type === 'shipping' ? 'bg-purple-50/50' : 'bg-blue-50/50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                            type === 'shipping' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                            {type === 'shipping'
                                ? <Ship className="text-purple-600" size={20} />
                                : <Plane className="text-blue-600" size={20} />
                            }
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{type === 'shipping' ? 'Línea Naviera' : 'Línea Aérea'}</h3>
                            <p className="text-sm text-slate-500">Detalle</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Fila 1: Código y Nombre */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <Hash size={16} className="text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Código</p>
                                <p className="text-sm font-semibold text-slate-700">{item.code || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            {type === 'shipping' ? (
                                <Ship size={16} className="text-slate-400" />
                            ) : (
                                <Plane size={16} className="text-slate-400" />
                            )}
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Nombre</p>
                                <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Estado y Fecha de creación */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Estado</p>
                                <p className={`text-sm font-semibold ${item.isActive ? 'text-emerald-600' : 'text-slate-500'}`}> 
                                    {item.isActive ? 'Activa' : 'Inactiva'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Fecha de creación</p>
                                <p className="text-sm text-slate-700">
                                    {new Date(item.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tarifas del Tarifario (solo para líneas navieras) */}
                    {type === 'shipping' && (
                        <div className="border-t border-slate-100 pt-6">
                            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <Package size={16} className="text-red-600" />
                                Tarifas del Tarifario
                                {tariffRates.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                        {tariffRates.filter(r => r.isActive).length} activa(s) / {tariffRates.length} total
                                    </span>
                                )}
                            </h4>

                            {loadingTariffRates ? (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="w-6 h-6 border-2 border-slate-300 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                                    <p className="mt-2 text-sm">Cargando tarifas...</p>
                                </div>
                            ) : tariffRates.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No hay tarifas del tarifario para esta línea</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Aliado</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Región</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">País</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Origen</th>
                                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Destino</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">20HC</th>
                                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">40HC</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Validez</th>
                                                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
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
                                                        <td className="px-3 py-2 font-medium text-slate-700 text-xs">{rate.ally?.name}</td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-xs font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                                {rate.region === 'CHINA' ? '🇨🇳 China' : '🌎 Otros'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600 text-xs">{countryDisplay}</td>
                                                        <td className="px-3 py-2 text-slate-600 text-xs">{originLabel}</td>
                                                        <td className="px-3 py-2 text-slate-600 text-xs">{destinationLabel}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-green-600 text-xs">${parseFloat(rate.sale20HC || 0).toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-green-600 text-xs">${parseFloat(rate.sale40HC || 0).toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] rounded ${!isExpired ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                                                                {isExpired && <AlertTriangle size={10} />}
                                                                {toVenezuelanFormat(toDateString(rate.validUntil))}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {rate.isActive ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded bg-emerald-50 text-emerald-700 font-medium">Activa</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded bg-slate-100 text-slate-500">Inactiva</span>
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
                    )}
                </div>

                <div className="flex justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LineDetailModal;
