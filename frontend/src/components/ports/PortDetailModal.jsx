import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Anchor, DollarSign, Building, Package, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import portService from '../../services/port.service';
import rateService from '../../services/rate.service';
import { toDateString, toVenezuelanFormat } from '../../utils/dateHelpers';
import { buildPortLookup, formatPortList } from '../../utils/locationFormatters';
import api from '../../lib/api';

const PortDetailModal = ({ isOpen, onClose, port }) => {
    const [portDetails, setPortDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tariffRates, setTariffRates] = useState([]);
    const [loadingTariffRates, setLoadingTariffRates] = useState(false);
    const [portCatalog, setPortCatalog] = useState([]);

    const portLookup = useMemo(() => buildPortLookup(portCatalog), [portCatalog]);

    const fetchPorts = useCallback(async () => {
        try {
            const res = await api.get('/ports?all=true');
            setPortCatalog(res.data.data || res.data || []);
        } catch (error) {
            console.error('Error loading ports for Port detail:', error);
        }
    }, []);

    const fetchPortDetails = useCallback(async () => {
        if (!port?.id) return;
        setLoading(true);
        try {
            const data = await portService.getPort(port.id);
            setPortDetails(data);
        } catch (error) {
            console.error('Error fetching port details:', error);
        } finally {
            setLoading(false);
        }
    }, [port?.id]);

    const fetchTariffRates = useCallback(async () => {
        if (!port?.id) return;
        setLoadingTariffRates(true);
        try {
            const result = await rateService.getRatesByPort(port.id);
            setTariffRates(result.data || []);
        } catch (error) {
            console.error('Error fetching tariff rates:', error);
        } finally {
            setLoadingTariffRates(false);
        }
    }, [port?.id]);

    useEffect(() => {
        if (isOpen && port?.id) {
            fetchPortDetails();
            fetchTariffRates();
            fetchPorts();
        }
    }, [isOpen, port?.id, fetchPortDetails, fetchTariffRates, fetchPorts]);

    if (!isOpen || !port) return null;

    const rates = portDetails?.rates || [];

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-blue-50/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <Anchor className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{port.name}</h3>
                            <p className="text-sm text-blue-600 font-medium">Código: {port.code}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="border-t border-slate-100 pt-6">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <DollarSign size={16} className="text-green-600" />
                            Tarifas asociadas a este Puerto
                            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                {rates.length}
                            </span>
                        </h4>

                        {loading ? (
                            <div className="text-center py-8 text-slate-400">
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                <p className="mt-2 text-sm">Cargando tarifas...</p>
                            </div>
                        ) : rates.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay tarifas asociadas a este puerto</p>
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
                                                <Package size={12} className="inline mr-1" /> Servicio
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                Origen
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                                Destino
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                                                <DollarSign size={12} className="inline mr-1" /> Costo
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                                                <DollarSign size={12} className="inline mr-1" /> Venta
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                                                <Clock size={12} className="inline mr-1" /> Vigencia
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rates.map(rate => {
                                            const isExpired = rate.validUntil && new Date(rate.validUntil) < new Date();
                                            return (
                                                <tr key={rate.id} className={`hover:bg-slate-50/50 ${isExpired ? 'opacity-60' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-slate-700">
                                                            {rate.ally?.name || 'Sin aliado'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {rate.service?.name}
                                                        <span className="text-xs text-slate-400 ml-1">({rate.service?.code})</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {rate.originPort || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {rate.destinationPort || '—'}
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
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="text-xs text-slate-600">
                                                            {rate.validFrom ? new Date(rate.validFrom).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'} - {rate.validUntil ? new Date(rate.validUntil).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Sin límite'}
                                                        </span>
                                                    </td>
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
                                <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                <p className="mt-2 text-sm">Cargando tarifas...</p>
                            </div>
                        ) : tariffRates.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                                <Package size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay tarifas del tarifario para este puerto</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Aliado</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Región</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">País</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Origen</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Destino</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Línea</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Venta 20HC</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Venta 40HC</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase"><Clock size={12} className="inline mr-1" /> Vigencia</th>
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
                                                    <td className="px-4 py-3 font-medium text-slate-700 text-xs">
                                                        {rate.ally?.name}
                                                    </td>
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
                                                        {isExpired ? (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-500 border border-red-200">VENCIDA</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-600">
                                                                {toVenezuelanFormat(toDateString(rate.validFrom))} - {toVenezuelanFormat(toDateString(rate.validUntil))}
                                                            </span>
                                                        )}
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

export default PortDetailModal;
