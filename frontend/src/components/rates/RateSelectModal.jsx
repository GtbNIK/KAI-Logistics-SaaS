import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Ship, Loader2, ArrowRight, DollarSign, Calendar, Globe } from 'lucide-react';
import rateService from '../../services/rate.service';

/**
 * Modal para seleccionar una tarifa (Rate) al cotizar.
 * Expande tarifas con múltiples puertos (n:n) a combinaciones 1:1.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string} allyId - Aliado seleccionado en la fila
 * @param {string} serviceType - FCL_20 | FCL_40HC
 * @param {Function} onPick - callback({ originPort, destinationPort, shippingLineId, shippingLineName, unitPrice })
 * @param {string=} shippingLineId - Línea naviera seleccionada en la fila (opcional)
 * @param {string=} originPortId - Puerto de origen preseleccionado en la fila (opcional)
 * @param {string=} destinationPortId - Puerto de destino preseleccionado en la fila (opcional)
 */
const RateSelectModal = ({ isOpen, onClose, allyId, serviceType, onPick, shippingLineId, originPortId, destinationPortId }) => {
    const [loading, setLoading] = useState(false);
    const [rates, setRates] = useState([]);
    const [region, setRegion] = useState('CHINA');
    const [searchText, setSearchText] = useState('');
    const showCol20 = serviceType === 'FCL_20';
    const showCol40 = serviceType === 'FCL_40HC';

    // Cargar tarifas cuando se abre el modal o cambia la región
    useEffect(() => {
        if (!isOpen || !allyId) return;

        const fetchRates = async () => {
            setLoading(true);
            try {
                const params = {
                    allyId,
                    region,
                    isActive: 'true',
                    status: 'valid',
                    limit: 200
                };
                if (shippingLineId) params.shippingLineId = shippingLineId;
                if (originPortId) params.originPortId = originPortId;
                if (destinationPortId) params.destinationPortId = destinationPortId;
                const res = await rateService.getRates(params);
                setRates(res.data || []);
            } catch (err) {
                console.error('Error cargando tarifas:', err);
                setRates([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRates();
    }, [isOpen, allyId, region]);

    // Expandir n:n → combinaciones 1:1
    const combos = useMemo(() => {
        const result = [];
        for (const rate of rates) {
            const origins = rate.originPorts || [];
            const dests = rate.destinationPorts || [];
            for (const origin of origins) {
                for (const dest of dests) {
                    result.push({
                        rateId: rate.id,
                        originPort: origin,
                        destinationPort: dest,
                        shippingLineId: rate.shippingLine?.id || null,
                        shippingLineName: rate.shippingLine?.name || '—',
                        sale20HC: rate.sale20HC,
                        sale40HC: rate.sale40HC,
                        validUntil: rate.validUntil,
                        allyName: rate.ally?.name || '—',
                        freeDays: rate.freeDays
                    });
                }
            }
        }
        return result;
    }, [rates]);

    // Filtrar por precio válido, shipping line y texto de búsqueda
    const filtered = useMemo(() => {
        let list = combos;
        // Filtrar por precio > 0 según tipo
        if (serviceType === 'FCL_20') {
            list = list.filter(c => c.sale20HC && Number(c.sale20HC) > 0);
        } else if (serviceType === 'FCL_40HC') {
            list = list.filter(c => c.sale40HC && Number(c.sale40HC) > 0);
        }
        // Filtrar por línea naviera si viene seleccionada
        if (shippingLineId) {
            list = list.filter(c => c.shippingLineId === shippingLineId);
        }
        // Filtrar por puertos preseleccionados
        if (originPortId) {
            list = list.filter(c => c.originPort?.id === originPortId);
        }
        if (destinationPortId) {
            list = list.filter(c => c.destinationPort?.id === destinationPortId);
        }
        // Filtrar por texto
        if (searchText.trim()) {
            const s = searchText.toLowerCase();
            list = list.filter(c =>
                c.originPort.name?.toLowerCase().includes(s) ||
                c.originPort.code?.toLowerCase().includes(s) ||
                c.destinationPort.name?.toLowerCase().includes(s) ||
                c.destinationPort.code?.toLowerCase().includes(s) ||
                c.shippingLineName?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [combos, searchText, serviceType, shippingLineId, originPortId, destinationPortId]);

    const handlePick = (combo) => {
        const unitPrice = serviceType === 'FCL_20' ? combo.sale20HC : combo.sale40HC;
        onPick({
            originPort: combo.originPort,
            destinationPort: combo.destinationPort,
            shippingLineId: combo.shippingLineId,
            shippingLineName: combo.shippingLineName,
            unitPrice,
            freeDays: combo.freeDays
        });
        onClose();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (!isOpen) return null;

    const modal = (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <DollarSign className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Elegir Tarifa</h3>
                            <p className="text-sm text-slate-500">
                                {serviceType === 'FCL_20' ? 'Contenedor 20\'' : 'Contenedor 40\'HC'} — Selecciona una ruta
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Controles: switch región + buscador */}
                <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
                    {/* Switch Región */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setRegion('CHINA')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                region === 'CHINA'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            🇨🇳 China
                        </button>
                        <button
                            onClick={() => setRegion('OTHER')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                region === 'OTHER'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Globe size={12} className="inline mr-1" />
                            Otros Países
                        </button>
                    </div>

                    {/* Buscador */}
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Buscar por puerto o naviera..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                    </div>

                    {/* Contador */}
                    <span className="text-xs text-slate-400">
                        {filtered.length} ruta{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Tabla de combinaciones */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={28} className="animate-spin text-blue-500" />
                            <span className="ml-3 text-slate-500">Cargando tarifas...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Ship size={40} className="mb-3 opacity-40" />
                            <p className="text-sm font-medium">No se encontraron tarifas</p>
                            <p className="text-xs mt-1">
                                {rates.length === 0
                                    ? 'Este aliado no tiene tarifas activas y vigentes para esta región.'
                                    : 'Intenta cambiar el filtro de búsqueda o región.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-medium">Ruta</th>
                                    <th className="px-4 py-3 font-medium">Naviera</th>
                                    {showCol20 && (
                                        <th className="px-4 py-3 font-medium text-right">$20'</th>
                                    )}
                                    {showCol40 && (
                                        <th className="px-4 py-3 font-medium text-right">$40'HC</th>
                                    )}
                                    <th className="px-4 py-3 font-medium text-center">Válida hasta</th>
                                    <th className="px-4 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((combo, idx) => {
                                    const isSelected20 = serviceType === 'FCL_20';
                                    const price = isSelected20 ? combo.sale20HC : combo.sale40HC;
                                    return (
                                        <tr
                                            key={`${combo.rateId}-${combo.originPort.id}-${combo.destinationPort.id}-${idx}`}
                                            className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            onClick={() => handlePick(combo)}
                                        >
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-700">
                                                        {combo.originPort.code || combo.originPort.name}
                                                    </span>
                                                    <ArrowRight size={14} className="text-slate-400" />
                                                    <span className="font-medium text-slate-700">
                                                        {combo.destinationPort.code || combo.destinationPort.name}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {combo.originPort.name} → {combo.destinationPort.name}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {combo.shippingLineName}
                                            </td>
                                            {showCol20 && (
                                                <td className={`px-4 py-3 text-right font-semibold ${
                                                    serviceType === 'FCL_20' ? 'text-green-600' : 'text-slate-500'
                                                }`}>
                                                    ${combo.sale20HC?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            {showCol40 && (
                                                <td className={`px-4 py-3 text-right font-semibold ${
                                                    serviceType === 'FCL_40HC' ? 'text-green-600' : 'text-slate-500'
                                                }`}>
                                                    ${combo.sale40HC?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar size={12} />
                                                    {formatDate(combo.validUntil)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                                    Seleccionar →
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer info */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 flex items-center justify-between">
                    <span>El precio seleccionado se puede editar manualmente después.</span>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 font-medium">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default RateSelectModal;
