import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { FileText, Save, ArrowLeft, Loader2, Plus, Trash2, Package, FileDown, Truck, MapPin, Ship, Plane } from 'lucide-react';
import clientService from '../../services/client.service';
import serviceService from '../../services/service.service';
import allyService from '../../services/ally.service';
import zoneService from '../../services/zone.service';
import portService from '../../services/port.service';
import quoteService from '../../services/quote.service';
import QuotePDFModal from '../../components/quotes/QuotePDFModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Componente para cada línea de item
const QuoteItemRow = ({ 
    item, 
    index, 
    services, 
    allies, 
    zones, 
	ports,
    loadingData,
    onUpdate, 
    onRemove, 
    canRemove,
    onRateFound
}) => {
    const [searchingRate, setSearchingRate] = useState(false);
    const [foundRate, setFoundRate] = useState(null);

    // Determinar tipo de servicio
    const selectedService = services.find(s => s.value === item.serviceId);
    const serviceType = selectedService?.data?.type;
    const isLandService = ['DOOR_TO_DOOR', 'WAREHOUSE', 'CUSTOMS', 'OTHER'].includes(serviceType);
    const isPortService = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(serviceType);

    // Buscar tarifa cuando cambian las selecciones
    useEffect(() => {
        const fetchRate = async () => {
            if (!item.serviceId || !item.allyId) {
                setFoundRate(null);
                return;
            }

            setSearchingRate(true);
            try {
                const rateService = (await import('../../services/rate.service')).default;
                const result = await rateService.findRate({
                    serviceId: item.serviceId,
                    allyId: item.allyId,
                    zoneId: item.zoneId || undefined,
                    originPort: item.originPort || undefined,
                    destinationPort: item.destinationPort || undefined
                });

                if (result.found && result.rate) {
                    setFoundRate(result.rate);
                    onUpdate(index, { unitPrice: result.rate.salePrice });
                    onRateFound(index, result.rate);
                } else {
                    setFoundRate(null);
                    onUpdate(index, { unitPrice: 0 });
                    onRateFound(index, null);
                }
            } catch {
                setFoundRate(null);
                onUpdate(index, { unitPrice: 0 });
                onRateFound(index, null);
            } finally {
                setSearchingRate(false);
            }
        };

        fetchRate();
    }, [item.serviceId, item.allyId, item.zoneId, item.originPort, item.destinationPort]);

    const subtotal = (item.quantity || 0) * (item.unitPrice || 0);

    return (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 relative group">
            {/* Header con número y botón eliminar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Item #{index + 1}</span>
                    {selectedService && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {serviceType}
                        </span>
                    )}
                </div>
                {canRemove && (
                    <button
                        onClick={() => onRemove(index)}
                        className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Fila 1: Servicio y Aliado */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Servicio</label>
                    <Select
                        options={services}
                        value={services.find(s => s.value === item.serviceId)}
                        isLoading={loadingData}
                        placeholder="Servicio..."
                        onChange={(opt) => onUpdate(index, { 
                            serviceId: opt?.value, 
                            zoneId: null, 
                            originPort: '', 
                            destinationPort: '' 
                        })}
                        className="text-sm"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{ 
                            control: (base) => ({ ...base, minHeight: '36px' }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">
                        {serviceType === 'AIR' ? 'Línea Aérea' : isPortService ? 'Línea Naviera' : 'Aliado'}
                    </label>
                    <Select
                        options={allies}
                        value={allies.find(a => a.value === item.allyId)}
                        isLoading={loadingData}
                        placeholder={serviceType === 'AIR' ? "Línea aérea..." : isPortService ? "Línea naviera..." : "Aliado..."}
                        onChange={(opt) => onUpdate(index, { allyId: opt?.value })}
                        className="text-sm"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{ 
                            control: (base) => ({ ...base, minHeight: '36px' }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>
            </div>

            {/* Fila 2: Zona o Puertos */}
            {isLandService && (
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Zona de Destino</label>
                    <Select
                        options={zones}
                        value={zones.find(z => z.value === item.zoneId)}
                        isLoading={loadingData}
                        placeholder="Zona..."
                        onChange={(opt) => onUpdate(index, { zoneId: opt?.value })}
                        isClearable
                        className="text-sm"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        styles={{ 
                            control: (base) => ({ ...base, minHeight: '36px' }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 })
                        }}
                    />
                </div>
            )}

            {isPortService && (
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Puerto Origen</label>
						<Select
							options={ports}
							value={ports.find(p => p.label === item.originPort)}
							isLoading={loadingData}
							placeholder="Puerto..."
							onChange={(opt) => onUpdate(index, { originPort: opt?.label || '' })}
							isClearable
							className="text-sm"
							menuPortalTarget={document.body}
							menuPosition="fixed"
							styles={{
								control: (base) => ({ ...base, minHeight: '36px' }),
								menuPortal: (base) => ({ ...base, zIndex: 9999 })
							}}
						/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Puerto Destino</label>
						<Select
							options={ports}
							value={ports.find(p => p.label === item.destinationPort)}
							isLoading={loadingData}
							placeholder="Puerto..."
							onChange={(opt) => onUpdate(index, { destinationPort: opt?.label || '' })}
							isClearable
							className="text-sm"
							menuPortalTarget={document.body}
							menuPosition="fixed"
							styles={{
								control: (base) => ({ ...base, minHeight: '36px' }),
								menuPortal: (base) => ({ ...base, zIndex: 9999 })
							}}
						/>
                    </div>
                </div>
            )}

            {/* Fila 3: Cantidad/CBM, Precio y Subtotal */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">
                        {serviceType === 'DOOR_TO_DOOR' ? 'CBM' : 'Cantidad'}
                    </label>
                    <input 
                        type="number" 
                        min={serviceType === 'DOOR_TO_DOOR' ? '0.01' : '1'}
                        step={serviceType === 'DOOR_TO_DOOR' ? '0.01' : '1'}
                        value={item.quantity}
                        onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const minValue = serviceType === 'DOOR_TO_DOOR' ? 0.01 : 1;
                            onUpdate(index, { quantity: value >= minValue ? value : minValue });
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Precio Unit. ($)</label>
                    <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => onUpdate(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none ${
                            foundRate ? 'border-green-300 bg-green-50/50' : 'border-slate-200'
                        }`}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Subtotal</label>
                    <div className="px-3 py-2 text-sm font-bold bg-slate-100 rounded-lg text-slate-700">
                        ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Indicador de tarifa */}
            {(searchingRate || item.serviceId && item.allyId) && (
                <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                    searchingRate ? 'text-blue-600' : foundRate ? 'text-green-600' : 'text-amber-600'
                }`}>
                    {searchingRate ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Buscando tarifa...</span>
                        </>
                    ) : foundRate ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span>Hay una tarifa Guardada para este servicio, si no desea usarla, puede modificarla manualmente: ${foundRate.salePrice.toFixed(2)}</span>
                        </>
                    ) : (item.serviceId && item.allyId) ? (
                        <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>NO existe una tarifa guardada para este Servicio. Coloca el precio Manualmente.</span>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
};

import { useParams } from 'react-router-dom';

// Componente principal
const CreateQuote = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showError, showSuccess, showWarning } = useToast();
    
    // Estados de carga
    const [loadingData, setLoadingData] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Datos para selectores
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [allies, setAllies] = useState([]);
    const [zones, setZones] = useState([]);
	const [ports, setPorts] = useState([]);

    // Estado del formulario
    const [clientId, setClientId] = useState(null);
    const [notes, setNotes] = useState('');
    const [showNotesToClient, setShowNotesToClient] = useState(true);
    const [nextQuoteNumber, setNextQuoteNumber] = useState(null);
    const [items, setItems] = useState([createEmptyItem()]);
    
    // Tarifas encontradas por item
    const [itemRates, setItemRates] = useState({});
    
    // Estado para el modal de PDF
    const [showPDFModal, setShowPDFModal] = useState(false);

    // Debounce para búsqueda de clientes
    const [clientInputValue, setClientInputValue] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);

    useEffect(() => {
        if (!clientInputValue.trim()) {
            setFilteredClients(clients);
            return;
        }
        const t = setTimeout(() => {
            const search = clientInputValue.toLowerCase();
            setFilteredClients(clients.filter(c => c.label.toLowerCase().includes(search)));
        }, 800);
        return () => clearTimeout(t);
    }, [clientInputValue, clients]);

    function createEmptyItem() {
        return {
            id: Date.now(), // ID temporal para key
            serviceId: null,
            allyId: null,
            zoneId: null,
            originPort: '',
            destinationPort: '',
            quantity: 1,
            unitPrice: 0,
            description: ''
        };
    }

    // Cargar datos iniciales
    useEffect(() => {
        const loadData = async () => {
            setLoadingData(true);
            try {
                const [clientsRes, servicesRes, alliesRes, zonesRes] = await Promise.all([
                    clientService.getClients({ limit: 100 }),
                    serviceService.getServices({ limit: 100 }),
                    allyService.getAllies({ limit: 100 }),
                    zoneService.getZones({ limit: 100 })
                ]);

                setClients(clientsRes.data.map(c => ({ value: c.id, label: c.name, data: c })));
                setServices(servicesRes.data.map(s => ({ value: s.id, label: s.name, type: s.type, data: s })));
                setAllies(alliesRes.data.map(a => ({ value: a.id, label: a.name, data: a })));
                setZones(zonesRes.data.map(z => ({ value: z.id, label: `(${z.internalCode}) ${z.name}`, data: z })));

				const portsRes = await portService.getPorts({ all: 'true' });
				setPorts((portsRes.data || []).map(p => ({ value: p.id, label: p.name, data: p })));

                if (id) {
                    const quote = await quoteService.getQuote(id);
                    setClientId(quote.clientId);
                    setNotes(quote.notes || '');
                    setShowNotesToClient(quote.showNotesToClient);
                    setNextQuoteNumber(quote.number);
                    
                    const mappedItems = quote.items.map(item => ({
                        id: item.id,
                        serviceId: item.serviceId,
                        allyId: item.allyId,
                        zoneId: item.zoneId,
                        originPort: item.originPort || '',
                        destinationPort: item.destinationPort || '',
                        quantity: parseFloat(item.quantity),
                        unitPrice: parseFloat(item.unitPrice),
                        description: item.description
                    }));
                    setItems(mappedItems);
                } else {
                    const nextNumRes = await quoteService.getNextNumber();
                    setNextQuoteNumber(nextNumRes.nextNumber);
                }

            } catch (error) {
                console.error('Error loading data:', error);
                showError('Error', 'Error al cargar datos iniciales');
            } finally {
                setLoadingData(false);
            }
        };

        loadData();
    }, [id]);

    // Actualizar un item
    const updateItem = (index, updates) => {
        setItems(prev => prev.map((item, i) => 
            i === index ? { ...item, ...updates } : item
        ));
    };

    // Agregar item
    const addItem = () => {
        setItems(prev => [...prev, createEmptyItem()]);
    };

    // Eliminar item
    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
        setItemRates(prev => {
            const newRates = { ...prev };
            delete newRates[index];
            return newRates;
        });
    };

    // Callback cuando se encuentra una tarifa
    const handleRateFound = (index, rate) => {
        setItemRates(prev => ({ ...prev, [index]: rate }));
    };

    // Calcular totales
    const calculateTotals = () => {
        const subtotals = items.map(item => (item.quantity || 0) * (item.unitPrice || 0));
        const total = subtotals.reduce((sum, st) => sum + st, 0);
        return { subtotals, total };
    };

    const { total } = calculateTotals();

    const handleSubmit = async () => {
        if (!clientId) {
            showWarning('Cliente requerido', 'Seleccione un cliente');
            return;
        }

        const validItems = items.filter(item => item.serviceId && item.unitPrice > 0);
        if (validItems.length === 0) {
            showWarning('Items requeridos', 'Agregue al menos un servicio con precio');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                clientId,
                validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
                notes,
                showNotesToClient,
                items: validItems.map(item => ({
                    serviceId: item.serviceId,
                    allyId: item.allyId,
                    zoneId: item.zoneId,
                    originPort: item.originPort || null,
                    destinationPort: item.destinationPort || null,
                    quantity: parseFloat(item.quantity),
                    unitPrice: parseFloat(item.unitPrice),
                    description: item.description || ''
                }))
            };

            if (id) {
                await quoteService.updateQuote(id, payload);
                showSuccess('¡Actualizado!', 'Cotización actualizada correctamente');
            } else {
                await quoteService.createQuote(payload);
                showSuccess('¡Éxito!', 'Cotización creada exitosamente');
            }
            
            navigate('/dashboard/cotizaciones');
        } catch (error) {
            console.error('Error saving quote:', error);
            showError('Error', 'Error al guardar la cotización');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/dashboard/cotizaciones')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="text-slate-500 hover:text-slate-700" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Cotizador</h1>
            </div>

            {/* Main Content - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                
                {/* Left Panel: Form */}
                <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col overflow-hidden min-h-[1000px]">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 mb-1">Configuración</h2>
                        <p className="text-sm text-slate-500">
                            Agregue los servicios que necesita el cliente.
                        </p>
                    </div>

                    {/* Cliente */}
                    <div className="space-y-2 mb-4">
                        <label className="text-sm font-medium text-slate-700">Cliente</label>
                        <Select
                            options={filteredClients}
                            value={clients.find(c => c.value === clientId)}
                            isLoading={loadingData}
                            placeholder="Buscar cliente..."
                            onChange={(opt) => setClientId(opt?.value)}
                            onInputChange={(val) => setClientInputValue(val)}
                            filterOption={() => true}
                            noOptionsMessage={() => 'Sin resultados'}
                            isClearable
                        />
                    </div>

					{/* Items */}
					<div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent min-h-[250px]">
						{items.map((item, index) => (
							<QuoteItemRow
								key={item.id}
								item={item}
								index={index}
								services={services}
								allies={allies}
								zones={zones}
								ports={ports}
								loadingData={loadingData}
								onUpdate={updateItem}
								onRemove={removeItem}
								canRemove={items.length > 1}
								onRateFound={handleRateFound}
							/>
						))}
					</div>

                    {/* Botón agregar item */}
					<button
						onClick={addItem}
						className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
					>
						<Plus size={18} />
						Agregar otro servicio
					</button>

                    {/* Notas */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">Notas (opcional)</label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-xs text-slate-600">Mostrar al cliente</span>
                                <input
                                    type="checkbox"
                                    checked={showNotesToClient}
                                    onChange={(e) => setShowNotesToClient(e.target.checked)}
                                    className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                                />
                            </label>
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg h-16 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                            placeholder="Notas internas..."
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="mt-4 flex gap-3">
                        {/* Botón Vista Previa PDF */}
                        <button
                            onClick={() => setShowPDFModal(true)}
                            disabled={!clientId || items.every(i => !i.serviceId)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <FileDown size={20} />
                            Ver PDF
                        </button>
                        
                        {/* Botón Guardar */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !clientId || items.every(i => !i.serviceId)}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Guardar
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="bg-slate-800 rounded-2xl shadow-xl p-6 text-white flex flex-col relative overflow-hidden min-h-[1000px]">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                    <div className="relative z-10 flex-1 flex flex-col">
                        <h2 className="text-xl font-bold mb-1">Vista Previa</h2>
                        <p className="text-slate-400 text-sm mb-4">Resumen de la cotización</p>

                        {/* Cliente seleccionado - Fijo */}
                        <div className="bg-white/100 rounded-lg px-4 py-3 mb-4">
                            {/* Número de cotización */}
                            <p className="text-xs text-slate-400 mb-1">
                                {nextQuoteNumber ? `COT-${String(nextQuoteNumber).padStart(5, '0')}` : 'NUEVA COTIZACIÓN'}
                            </p>
                            
                            <span className="text-slate-800 text-xs">Cliente</span>
                            <p className="font-medium text-black mb-2">
                                {clients.find(c => c.value === clientId)?.label || 'Sin seleccionar'}
                            </p>
                            
                            {/* Dos columnas para la info del cliente */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {/* Columna 1 */}
                                <div className="space-y-1">
                                    {(() => {
                                        const selectedClient = clients.find(c => c.value === clientId);
                                        return (
                                            <>
                                                {selectedClient?.data?.rifOrId && (
                                                    <p className="text-xs text-slate-600">
                                                        RIF/Cédula: {selectedClient.data.rifOrId}
                                                    </p>
                                                )}
                                                {selectedClient?.data?.contactPerson && (
                                                    <p className="text-xs text-slate-600">
                                                        Contacto: {selectedClient.data.contactPerson}
                                                    </p>
                                                )}
                                                {selectedClient?.data?.phone && (
                                                    <p className="text-xs text-slate-600">
                                                        Teléfono: {selectedClient.data.phone}
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                
                                {/* Columna 2 */}
                                <div className="space-y-1">
                                    {(() => {
                                        const selectedClient = clients.find(c => c.value === clientId);
                                        return (
                                            <>
                                                {selectedClient?.data?.email && (
                                                    <p className="text-xs text-slate-600">
                                                        Email: {selectedClient.data.email}
                                                    </p>
                                                )}
                                                {selectedClient?.data?.address && (
                                                    <p className="text-xs text-slate-600">
                                                        Dirección: {selectedClient.data.address}
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Divisor de servicios - Fijo */}
                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2 ">
                                <Package size={16} className="text-white" />
                                <span className="font-bold text-sm text-white">Servicios en la cotización:</span>
                            </div>
                            <div className="h-px bg-white/30 mb-2"></div>
                        </div>

                        {/* Lista de items - Scrolleable */}
                        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
                            {items.filter(i => i.serviceId).map((item, index) => {
                                const service = services.find(s => s.value === item.serviceId);
                                const ally = allies.find(a => a.value === item.allyId);
                                const zone = zones.find(z => z.value === item.zoneId);
                                const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
                                
                                // Determinar destino según tipo de servicio
                                const serviceType = service?.data?.type;
                                const isPortService = ['FCL_20', 'FCL_40', 'FCL_40HC', 'LCL', 'AIR'].includes(serviceType);
                                
                                // Extraer solo el nombre de la zona (sin el código)
                                const zoneName = zone?.label ? zone.label.split(' - ')[1] || zone.label : null;
                                
                                const destination = isPortService 
                                    ? (item.originPort && item.destinationPort ? `${item.originPort} → ${item.destinationPort}` : null)
                                    : zoneName;
                                
                                return (
                                    <div key={item.id} className="bg-white/5 rounded-lg px-4 py-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-medium text-sm">{service?.label || 'Servicio'}</p>
                                            <span className="font-bold">
                                                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-400 space-y-0.5">
                                            {ally && (
                                                <p className="flex items-center gap-1">
                                                    {serviceType === 'AIR' ? (
                                                        <Plane size={12} className="text-slate-500" />
                                                    ) : isPortService ? (
                                                        <Ship size={12} className="text-slate-500" />
                                                    ) : (
                                                        <Truck size={12} className="text-slate-500" />
                                                    )}
                                                    <span>{ally.label}</span>
                                                </p>
                                            )}
                                            {destination && (
                                                <p className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-slate-500" />
                                                    <span>{destination}</span>
                                                </p>
                                            )}
                                            <p className="text-slate-500">
                                                {item.quantity}x @ ${item.unitPrice.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {items.every(i => !i.serviceId) && (
                                <div className="text-center text-slate-500 py-8">
                                    <Package size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Agregue servicios para ver el resumen</p>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div className="bg-white text-slate-800 rounded-xl p-4 flex justify-between items-center">
                            <div>
                                <span className="text-sm text-slate-500">Total Estimado</span>
                                <p className="text-xs text-slate-400">{items.filter(i => i.serviceId).length} item(s)</p>
                            </div>
                            <span className="text-2xl font-bold">
                                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modal de Vista Previa PDF */}
            <QuotePDFModal
                isOpen={showPDFModal}
                onClose={() => setShowPDFModal(false)}
                quote={{
                    client: clients.find(c => c.value === clientId),
                    user,
                    items,
                    total,
                    notes,
                    showNotesToClient,
                    number: nextQuoteNumber,
                    validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                }}
                services={services}
                allies={allies}
                zones={zones}
            />
        </div>
    );
};

export default CreateQuote;
