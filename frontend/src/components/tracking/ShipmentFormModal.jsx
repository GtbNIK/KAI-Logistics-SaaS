import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Container, Package } from 'lucide-react';
import Select from 'react-select';
import shipmentService from '../../services/shipment.service';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import QuickCreatePortModal from '../shared/QuickCreatePortModal';
import QuickCreateShippingLineModal from '../shared/QuickCreateShippingLineModal';
import QuickCreateAirLineModal from '../shared/QuickCreateAirLineModal';
import airlineService from '../../services/airline.service';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'AT_ORIGIN_WAREHOUSE', label: 'En Almacén Origen' },
    { value: 'ON_VESSEL', label: 'En Tránsito' },
    { value: 'AT_DESTINATION_PORT', label: 'En Puerto Destino' },
    { value: 'CUSTOMS_CLEARANCE', label: 'En Aduana' },
    { value: 'DELIVERED', label: 'Entregado' },
];

const CONTAINER_TYPES = [
    { value: '20ft', label: '20 pies' },
    { value: '40ft', label: '40 pies' },
    { value: '40HC', label: '40 HC' },
];

const selectStyles = {
    control: (base) => ({
        ...base, borderColor: '#e2e8f0', borderRadius: '0.75rem',
        minHeight: '42px', boxShadow: 'none', '&:hover': { borderColor: '#94a3b8' }
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const ShipmentFormModal = ({ isOpen, shipment, onClose, onSuccess }) => {
    const isEdit = !!shipment;
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quickCreateType, setQuickCreateType] = useState(null);

    // Catálogos
    const [availableNotices, setAvailableNotices] = useState([]);
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [shippingLines, setShippingLines] = useState([]);
    const [airLines, setAirLines] = useState([]);
    const [ports, setPorts] = useState([]);
    const [d2dItems, setD2dItems] = useState([]);
    const [allies, setAllies] = useState([]);

    // Toggle: ¿tiene aviso de cobro vinculado?
    const [hasNotice, setHasNotice] = useState(true);

    // Form state
    const [form, setForm] = useState({
        type: 'FCL',
        paymentNoticeId: '',
        blNumber: '',
        whNumber: '',      // Warehouse Number para D2D
        bookingNumber: '',
        shippingLineId: '',
        airLineId: '',
        status: 'PENDING',
        clientId: '',
        clientName: '',
        vendedorId: '',
        currentLocation: '',
        // FCL
        containerType: '', // DEPRECADO
        containerQty: '', // DEPRECADO
        containers: [], // Nuevo: array de {containerType, quantity}
        originPort: '',
        destPort: '',
        etd: '',
        eta: '',
        transitTime: '',
        aliadoId: '',
        // D2D
        weight: '',
        quantity: '',
        cbm: '',
        d2dItemIds: [],
        cst: '',
        consolidadoManual: '',
        transportType: 'naviera', // Por defecto naviera
        d2dEta: '',
        deliveryPlace: '',
        d2dTransitTime: '',
        d2dAliadoId: '',
        // CONSOLIDADO
        consolidadoNumber: '',
        arrivalPort: '',
        consolidadoTransitTime: '',
    });
    const [errors, setErrors] = useState({});

    // Cargar catálogos
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [notices, usersData, clientsData, shippingLinesData, portsData, airLinesData, d2dItemsData, alliesData] = await Promise.all([
                    shipmentService.getAvailableNotices(),
                    shipmentService.getVendedores(),
                    shipmentService.getClients(),
                    shipmentService.getShippingLines(),
                    shipmentService.getPorts(),
                    airlineService.getAirLines(),
                    shipmentService.getD2DItems(),
                    shipmentService.getAllies()
                ]);
                setAvailableNotices(Array.isArray(notices) ? notices : []);
                setUsers(Array.isArray(usersData) ? usersData : []);
                setClients(Array.isArray(clientsData) ? clientsData : []);
                setShippingLines(Array.isArray(shippingLinesData) ? shippingLinesData : []);
                setPorts(Array.isArray(portsData) ? portsData : []);
                setD2dItems(Array.isArray(d2dItemsData) ? d2dItemsData : []);
                setAllies(Array.isArray(alliesData) ? alliesData : []);
                setAirLines((airLinesData?.data || []))
            } catch (err) {
                console.error('Error loading catalogs:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Prellenar en modo edición
    useEffect(() => {
        if (isEdit && shipment) {
            // En edición, detectar si tenía aviso de cobro o no
            setHasNotice(!!shipment.paymentNoticeId);
            setForm({
                type: shipment.type || 'FCL',
                paymentNoticeId: shipment.paymentNoticeId || '',
                blNumber: shipment.blNumber || '',
                whNumber: shipment.whNumber || '',
                bookingNumber: shipment.bookingNumber || '',
                shippingLineId: shipment.shippingLineId || '',
                airLineId: shipment.airLineId || '',
                status: shipment.status || 'PENDING',
                clientId: shipment.clientId || '',
                clientName: shipment.clientName || '',
                vendedorId: shipment.vendedorId || '',
                currentLocation: shipment.currentLocation || '',
                containerType: shipment.containerType || '',
                containerQty: shipment.containerQty || '',
                containers: shipment.containers || [],
                originPort: shipment.originPort || '',
                destPort: shipment.destPort || '',
                etd: shipment.etd ? shipment.etd.slice(0, 10) : '',
                eta: shipment.eta ? shipment.eta.slice(0, 10) : '',
                transitTime: shipment.transitTime || '',
                aliadoId: shipment.aliadoId || '',
                weight: shipment.weight || '',
                quantity: shipment.quantity || '',
                cbm: shipment.cbm || '',
                d2dItemIds: shipment.d2dShipmentItems?.map(item => item.d2dItemId) || [],
                cst: shipment.cst || '',
                consolidadoManual: shipment.consolidadoManual || '',
                transportType: shipment.transportType || 'naviera',
                d2dEta: shipment.d2dEta ? shipment.d2dEta.slice(0, 10) : '',
                deliveryPlace: shipment.deliveryPlace || '',
                d2dTransitTime: shipment.d2dTransitTime || '',
                d2dAliadoId: shipment.d2dAliadoId || '',
                consolidadoNumber: shipment.consolidadoNumber || '',
                arrivalPort: shipment.arrivalPort || '',
                consolidadoTransitTime: shipment.consolidadoTransitTime || '',
            });
        }
    }, [shipment, isEdit]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // Cuando el usuario cambia el modo (con/sin AVC), limpiar los campos del otro modo
    const handleHasNoticeToggle = (value) => {
        setHasNotice(value);
        if (value) {
            // Modo AVC: limpiar cliente manual
            handleChange('clientId', '');
            handleChange('clientName', '');
        } else {
            // Modo sin AVC: limpiar aviso de cobro
            handleChange('paymentNoticeId', '');
            handleChange('clientId', '');
            handleChange('clientName', '');
        }
    };

    // Al seleccionar un aviso de cobro, auto-rellenar el cliente (locked)
    const handleNoticeChange = (opt) => {
        setForm(prev => ({
            ...prev,
            paymentNoticeId: opt?.value || '',
            clientId: opt?.clientId || '',
            clientName: opt?.clientName || '',
        }));
    };


    const validateForm = () => {
        const err = {};
        // Validación común: aviso o cliente ya se valida abajo
        if (form.etd && form.eta) {
            const etd = new Date(form.etd);
            const eta = new Date(form.eta);
            if (etd > eta) {
                err.eta = 'ETA debe ser posterior o igual al ETD';
                err.etd = 'ETD no puede ser mayor que ETA';
            }
        }
        if (form.type === 'FCL') {
            if (!Array.isArray(form.containers) || form.containers.length === 0) err.containers = 'Agrega al menos un contenedor';
            if (Array.isArray(form.containers)) {
                form.containers.forEach((c, i) => {
                    if (!c.containerType) err[`containers.${i}.containerType`] = 'Tipo requerido';
                    if (!c.quantity || c.quantity < 1) err[`containers.${i}.quantity`] = 'Cantidad >= 1';
                });
            }
            if (!form.originPort) err.originPort = 'Requerido';
            if (!form.destPort) err.destPort = 'Requerido';
            if (!form.etd) err.etd = 'Requerido';
            if (!form.eta) err.eta = 'Requerido';
            if (!form.transitTime && form.transitTime !== 0) err.transitTime = 'Requerido';
            if (!form.aliadoId) err.aliadoId = 'Requerido';
        } else if (form.type === 'D2D') {
            if (!form.originPort) err.originPort = 'Requerido';
            if (!form.deliveryPlace) err.deliveryPlace = 'Requerido';
            if (!Array.isArray(form.d2dItemIds) || form.d2dItemIds.length === 0) err.d2dItemIds = 'Selecciona al menos un ítem';
            if (!form.weight) err.weight = 'Requerido';
            if (!form.quantity) err.quantity = 'Requerido';
            if (!form.cbm) err.cbm = 'Requerido';
            if (!form.cst) err.cst = 'Requerido';
            if (!form.d2dEta) err.d2dEta = 'Requerido';
            if (!form.d2dTransitTime && form.d2dTransitTime !== 0) err.d2dTransitTime = 'Requerido';
            if (!form.d2dAliadoId) err.d2dAliadoId = 'Requerido';
        } else if (form.type === 'CONSOLIDADO') {
            if (!form.consolidadoNumber) err.consolidadoNumber = 'Requerido';
            if (!form.arrivalPort) err.arrivalPort = 'Requerido';
            if (!form.etd) err.etd = 'Requerido';
            if (!form.eta) err.eta = 'Requerido';
            if (!form.consolidadoTransitTime && form.consolidadoTransitTime !== 0) err.consolidadoTransitTime = 'Requerido';
        }
        return err;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const v = validateForm();
        if (Object.keys(v).length > 0) {
            setErrors(v);
            if (v.containers) {
                showError('Contenedores requeridos', 'Agrega al menos un contenedor');
            } else if (v.etd === 'ETD no puede ser mayor que ETA' || v.eta === 'ETA debe ser posterior o igual al ETD') {
                showError('Fechas inválidas', 'ETD no puede ser mayor que ETA');
            } else {
                showError('Faltan datos', 'Revisa y llena los campos obligatorios marcados en rojo.');
            }
            return;
        }
        setErrors({});
        setSaving(true);
        try {
            if (isEdit) {
                await shipmentService.updateShipment(shipment.id, form);
                showSuccess('Embarque actualizado', 'Los cambios se guardaron correctamente');
            } else {
                if (hasNotice && !form.paymentNoticeId) {
                    showError('Error', 'Debes seleccionar un aviso de cobro');
                    setSaving(false);
                    return;
                }
                if (!hasNotice && !form.clientId) {
                    showError('Error', 'Debes seleccionar un cliente');
                    setSaving(false);
                    return;
                }
                await shipmentService.createShipment(form);
                showSuccess('Embarque creado', 'El tracking se registró correctamente');
            }
            onSuccess();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'No se pudo guardar el embarque');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const isFCL = form.type === 'FCL';
    const isConsolidado = form.type === 'CONSOLIDADO'


    // Opciones para selects
    const noticeOptions = availableNotices.map(n => ({
        value: n.id,
        label: `AVC-${String(n.number).padStart(5, '0')} — ${n.client?.name || 'N/A'} — $${parseFloat(n.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        clientId: n.clientId,
        clientName: n.client?.name || '',
    }));

    const currentNoticeOption = isEdit && shipment?.paymentNotice
        ? {
            value: shipment.paymentNoticeId,
            label: `AVC-${String(shipment.paymentNotice.number).padStart(5, '0')} — ${shipment.paymentNotice.client?.name || 'N/A'}`,
            clientId: shipment.clientId,
            clientName: shipment.paymentNotice.client?.name || '',
        }
        : null;

    const allNoticeOptions = currentNoticeOption
        ? [currentNoticeOption, ...noticeOptions.filter(o => o.value !== currentNoticeOption.value)]
        : noticeOptions;

    const userOptions = users.map(u => ({ value: u.id, label: u.name }));
    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} — ${c.rifOrId}`, rawName: c.name }));
    
    // Opciones de líneas navieras con "Agregar nuevo" solo para ADMIN
    const baseShippingLineOptions = shippingLines.map(sl => ({ value: sl.id, label: sl.name }));
    const shippingLineOptions = user?.role === 'ADMIN'
        ? [...baseShippingLineOptions, { value: 'NEW', label: '+ Agregar nueva línea naviera', isAction: true }]
        : baseShippingLineOptions;
    
    // Opciones de puertos con "Agregar nuevo" solo para ADMIN
    const basePortOptions = ports.map(p => ({ value: p.name, label: p.name }));
    const portOptions = user?.role === 'ADMIN'
        ? [...basePortOptions, { value: 'NEW', label: '+ Agregar nuevo puerto', isAction: true }]
        : basePortOptions;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isFCL ? 'bg-indigo-50' : 'bg-teal-50'}`}>
                            {isFCL
                                ? <Container className="text-indigo-600" size={20} />
                                : <Package className="text-teal-600" size={20} />
                            }
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {isEdit ? 'Editar Embarque' : 'Nuevo Embarque'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-slate-400" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Tipo de embarque */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Embarque</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button type="button"
                                        onClick={() => !isEdit && handleChange('type', 'FCL')}
                                        disabled={isEdit}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                            form.type === 'FCL'
                                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        } ${isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Container size={18} /> FCL
                                    </button>
                                    <button type="button"
                                        onClick={() => !isEdit && handleChange('type', 'D2D')}
                                        disabled={isEdit}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                            form.type === 'D2D'
                                                ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        } ${isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Package size={18} /> Door to Door
                                    </button>
                                    <button type="button"
                                        onClick={() => !isEdit && handleChange('type', 'CONSOLIDADO')}
                                        disabled={isEdit}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                            form.type === 'CONSOLIDADO'
                                                ? 'border-purple-400 bg-purple-50 text-purple-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        } ${isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Package size={18} /> Consolidado
                                    </button>
                                </div>
                            </div>

                            {/* Toggle: ¿Tiene aviso de cobro? */}
                            {!isEdit && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    <p className="text-sm font-semibold text-slate-700 mb-3">
                                        ¿Este embarque tiene un aviso de cobro vinculado?
                                    </p>
                                    <div className="flex gap-3">
                                        <button type="button"
                                            onClick={() => handleHasNoticeToggle(true)}
                                            className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                                hasNotice
                                                    ? 'border-sky-400 bg-sky-50 text-sky-700'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}>
                                            Sí, vincular AVC
                                        </button>
                                        <button type="button"
                                            onClick={() => handleHasNoticeToggle(false)}
                                            className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                                !hasNotice
                                                    ? 'border-slate-500 bg-slate-100 text-slate-700'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}>
                                            No, solo cliente
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Aviso de Cobro (visible solo si hasNotice o edición con AVC) */}
                            {(hasNotice || (isEdit && form.paymentNoticeId)) && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Aviso de Cobro vinculado
                                    </label>
                                    <Select
                                        options={allNoticeOptions}
                                        value={allNoticeOptions.find(o => o.value === form.paymentNoticeId) || null}
                                        onChange={handleNoticeChange}
                                        placeholder="Seleccionar aviso..."
                                        isClearable={!isEdit}
                                        isDisabled={isEdit}
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                        noOptionsMessage={() => 'Sin avisos disponibles'}
                                    />
                                    {/* Cliente auto-rellenado (solo lectura) */}
                                    {form.clientName && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-sky-50 rounded-lg border border-sky-100">
                                            <span className="text-xs text-sky-600 font-medium">Cliente:</span>
                                            <span className="text-sm text-sky-800 font-semibold">{form.clientName}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cliente manual (visible solo si !hasNotice o edición sin AVC) */}
                            {(!hasNotice || (isEdit && !form.paymentNoticeId)) && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                                    <Select
                                        options={clientOptions}
                                        value={clientOptions.find(o => o.value === form.clientId) || null}
                                        onChange={opt => {
                                            handleChange('clientId', opt?.value || '');
                                            handleChange('clientName', opt?.rawName || '');
                                        }}
                                        placeholder="Seleccionar cliente..."
                                        isClearable
                                        styles={selectStyles}
                                        menuPortalTarget={document.body}
                                        menuPosition="fixed"
                                    />
                                </div>
                            )}

                            {/* Vendedor */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Vendedor <span className="text-red-500">*</span></label>
                                <Select
                                    options={userOptions}
                                    value={userOptions.find(o => o.value === form.vendedorId) || null}
                                    onChange={opt => handleChange('vendedorId', opt?.value || '')}
                                    placeholder="Seleccionar..."
                                    isClearable
                                    styles={selectStyles}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                />
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Estado <span className="text-red-500">*</span></label>
                                <select value={form.status}
                                    onChange={e => handleChange('status', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        {form.type === 'D2D' ? 'Nro. Warehouse' : 'Nro. BL'} <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={form.type === 'D2D' ? form.whNumber : form.blNumber}
                                        onChange={e => handleChange(form.type === 'D2D' ? 'whNumber' : 'blNumber', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-200"
                                        placeholder={form.type === 'D2D' ? 'WH-000...' : 'BL-000...'} 
                                    />
                                </div>
                                {isFCL && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nro. Booking <span className="text-red-500">*</span></label>
                                        <input type="text" value={form.bookingNumber}
                                            onChange={e => handleChange('bookingNumber', e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-200"
                                            placeholder="BOOK-000..." />
                                    </div>
                                )}
                            </div>

                            {form.type !== 'D2D' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        {isFCL || isConsolidado ? 'Línea Naviera' : 'Línea Aérea'} <span className="text-red-500">*</span>
                                    </label>
                                    {(isFCL || isConsolidado) ? (
                                        <Select
                                            options={shippingLineOptions}
                                            value={baseShippingLineOptions.find(o => o.value === form.shippingLineId) || null}
                                            onChange={(opt) => {
                                                if (opt?.value === 'NEW') { setQuickCreateType('SHIPPING_LINE'); return; }
                                                handleChange('shippingLineId', opt?.value || '');
                                            }}
                                            placeholder="Seleccionar naviera..."
                                            isClearable
                                            styles={{
                                                ...selectStyles,
                                                option: (base, state) => ({
                                                    ...base,
                                                    color: state.data.isAction ? '#12284bff' : base.color,
                                                    fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                    borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                })
                                            }}
                                            menuPortalTarget={document.body}
                                            menuPosition="fixed"
                                        />
                                    ) : (
                                        <Select
                                            options={user?.role === 'ADMIN'
                                                ? [...airLines.map(a => ({ value: a.id, label: a.code ? `${a.code} — ${a.name}` : a.name })), { value: 'NEW', label: '+ Agregar nueva aerolínea', isAction: true }]
                                                : airLines.map(a => ({ value: a.id, label: a.code ? `${a.code} — ${a.name}` : a.name }))
                                            }
                                            value={airLines.map(a => ({ value: a.id, label: a.code ? `${a.code} — ${a.name}` : a.name })).find(o => o.value === form.airLineId) || null}
                                            onChange={(opt) => {
                                                if (opt?.value === 'NEW') { setQuickCreateType('AIR_LINE'); return; }
                                                handleChange('airLineId', opt?.value || '');
                                            }}
                                            placeholder="Seleccionar aerolínea..."
                                            isClearable
                                            styles={{
                                                ...selectStyles,
                                                option: (base, state) => ({
                                                    ...base,
                                                    color: state.data.isAction ? '#12284bff' : base.color,
                                                    fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                    borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                })
                                            }}
                                            menuPortalTarget={document.body}
                                            menuPosition="fixed"
                                        />
                                    )}
                                </div>
                            </div>
                            )}

                            {/* Ubicación actual */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Ubicación actual (opcional)</label>
                                <input type="text" value={form.currentLocation}
                                    onChange={e => handleChange('currentLocation', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    placeholder="Ej: En tránsito - Puerto de Shanghai" />
                            </div>

                            {/* ── Campos FCL ── */}
                            {form.type === 'FCL' && (
                                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                                        <Container size={16} /> Datos FCL
                                    </h4>
                                    
                                    {/* Tabla de Contenedores */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-semibold text-slate-600">Contenedores <span className="text-red-500">*</span></label>
                                            <button type="button"
                                                onClick={() => handleChange('containers', [...form.containers, { containerType: '', quantity: 1 }])}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm ${errors.containers ? 'ring-2 ring-red-200 animate-pulse' : ''}`}>
                                                <span>+</span> Agregar Contenedor
                                            </button>
                                        </div>
                                        {form.containers.length > 0 && (
                                            <div className={`space-y-2 ${errors.containers ? 'border border-red-300 rounded-lg p-2 bg-red-50/40' : ''}`}>
                                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 px-2">
                                                    <div>Tipo:</div>
                                                    <div className='text-right pr-14'>Cantidad:</div>
                                                </div>
                                                {form.containers.map((container, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-indigo-100">
                                                        <select
                                                            id={`containerType-${idx}`}
                                                            value={container.containerType}
                                                            onChange={e => {
                                                                const newType = e.target.value;
                                                                const updated = [...form.containers];
                                                                // Asignar nuevo tipo al item actual
                                                                updated[idx].containerType = newType;
                                                                // Si el nuevo tipo ya existe en otro item, fusionar cantidades y eliminar duplicado
                                                                if (newType) {
                                                                    const existingIndex = updated.findIndex((c, i) => i !== idx && c.containerType === newType);
                                                                    if (existingIndex !== -1) {
                                                                        const a = parseInt(updated[existingIndex].quantity) || 0;
                                                                        const b = parseInt(updated[idx].quantity) || 0;
                                                                        updated[existingIndex].quantity = a + b;
                                                                        updated.splice(idx, 1);
                                                                    }
                                                                }
                                                                handleChange('containers', updated);
                                                            }}
                                                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
                                                            <option value="">Seleccionar tipo...</option>
                                                            {CONTAINER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                        </select>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={container.quantity}
                                                            onChange={e => {
                                                                const updated = [...form.containers];
                                                                updated[idx].quantity = parseInt(e.target.value) || 1;
                                                                handleChange('containers', updated);
                                                            }}
                                                            className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                                                            placeholder="Cant." />
                                                        <button type="button"
                                                            onClick={() => handleChange('containers', form.containers.filter((_, i) => i !== idx))}
                                                            className="text-red-500 hover:text-red-600 p-1">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {errors.containers && (
                                                    <p className="text-xs text-red-600">{errors.containers}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Estado (visible también en D2D) */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Estado <span className="text-red-500">*</span></label>
                                        <select value={form.status}
                                            onChange={e => handleChange('status', e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 bg-white">
                                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>

                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Origen <span className="text-red-500">*</span></label>
                                            <Select
                                                options={portOptions}
                                                value={basePortOptions.find(o => o.value === form.originPort) || null}
                                                onChange={(opt) => {
                                                    if (opt?.value === 'NEW') {
                                                        setQuickCreateType('PORT_ORIGIN');
                                                        return;
                                                    }
                                                    handleChange('originPort', opt?.value || '');
                                                }}
                                                placeholder="Seleccionar puerto..."
                                                isClearable
                                                styles={{
                                                    ...selectStyles,
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: state.data.isAction ? '#12284bff' : base.color,
                                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                    })
                                                }}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Destino <span className="text-red-500">*</span></label>
                                            <Select
                                                options={portOptions}
                                                value={basePortOptions.find(o => o.value === form.destPort) || null}
                                                onChange={(opt) => {
                                                    if (opt?.value === 'NEW') {
                                                        setQuickCreateType('PORT_DESTINATION');
                                                        return;
                                                    }
                                                    handleChange('destPort', opt?.value || '');
                                                }}
                                                placeholder="Seleccionar puerto..."
                                                isClearable
                                                styles={{
                                                    ...selectStyles,
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: state.data.isAction ? '#12284bff' : base.color,
                                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                    })
                                                }}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETD (Salida estimada) <span className="text-red-500">*</span></label>
                                            <input type="date" value={form.etd}
                                                onChange={e => handleChange('etd', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETA (Llegada estimada) <span className="text-red-500">*</span></label>
                                            <input type="date" value={form.eta}
                                                onChange={e => handleChange('eta', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Tiempo de Travesía (días) <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" value={form.transitTime}
                                                onChange={e => handleChange('transitTime', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                placeholder="Ej: 30" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Aliado <span className="text-red-500">*</span></label>
                                            <Select
                                                options={allies.map(a => ({ value: a.id, label: a.name }))}
                                                value={allies.find(a => a.id === form.aliadoId) ? { value: form.aliadoId, label: allies.find(a => a.id === form.aliadoId).name } : null}
                                                onChange={opt => handleChange('aliadoId', opt?.value || '')}
                                                placeholder="Seleccionar aliado..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Campos D2D ── */}
                            {form.type === 'D2D' && (
                                <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-teal-700 flex items-center gap-2">
                                        <Package size={16} /> Datos Door to Door
                                    </h4>
                                    
                                    {/* Toggle Aéreo/Naviera */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-2">Tipo de transporte <span className="text-red-500">*</span></label>
                                        <div className="flex gap-3">
                                            <button type="button"
                                                onClick={() => handleChange('transportType', 'naviera')}
                                                className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                                    form.transportType === 'naviera'
                                                        ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                }`}>
                                                Naviera
                                            </button>
                                            <button type="button"
                                                onClick={() => handleChange('transportType', 'aereo')}
                                                className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                                                    form.transportType === 'aereo'
                                                        ? 'border-sky-400 bg-sky-50 text-sky-700'
                                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                                }`}>
                                                Aéreo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Línea Naviera o Aérea según toggle */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                            {form.transportType === 'aereo' ? 'Línea Aérea' : 'Línea Naviera'} <span className="text-red-500">*</span>
                                        </label>
                                        {form.transportType === 'aereo' ? (
                                            <Select
                                                options={airLines.map(a => ({ value: a.id, label: `${a.name}${a.code ? ` (${a.code})` : ''}` }))}
                                                value={airLines.find(a => a.id === form.airLineId) ? { value: form.airLineId, label: airLines.find(a => a.id === form.airLineId).name } : null}
                                                onChange={opt => handleChange('airLineId', opt?.value || '')}
                                                placeholder="Seleccionar línea aérea..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        ) : (
                                            <Select
                                                options={shippingLineOptions}
                                                value={baseShippingLineOptions.find(o => o.value === form.shippingLineId) || null}
                                                onChange={(opt) => {
                                                    if (opt?.value === 'NEW') {
                                                        setQuickCreateType('SHIPPING_LINE');
                                                        return;
                                                    }
                                                    handleChange('shippingLineId', opt?.value || '');
                                                }}
                                                placeholder="Seleccionar línea naviera..."
                                                isClearable
                                                styles={{
                                                    ...selectStyles,
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: state.data.isAction ? '#12284bff' : base.color,
                                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                    })
                                                }}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Origen <span className="text-red-500">*</span></label>
                                            <Select
                                                options={portOptions}
                                                value={basePortOptions.find(o => o.value === form.originPort) || null}
                                                onChange={(opt) => {
                                                    if (opt?.value === 'NEW') {
                                                        setQuickCreateType('PORT_ORIGIN');
                                                        return;
                                                    }
                                                    handleChange('originPort', opt?.value || '');
                                                }}
                                                placeholder="Seleccionar puerto..."
                                                isClearable
                                                styles={{
                                                    ...selectStyles,
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: state.data.isAction ? '#12284bff' : base.color,
                                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                    })
                                                }}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Lugar de entrega <span className="text-red-500">*</span></label>
                                            <input type="text" value={form.deliveryPlace}
                                                onChange={e => handleChange('deliveryPlace', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="Ej: Almacén central" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Items / Servicios <span className="text-red-500">*</span></label>
                                        <Select
                                            isMulti
                                            options={d2dItems.map(item => ({ value: item.id, label: item.description }))}
                                            value={d2dItems.filter(item => form.d2dItemIds.includes(item.id)).map(item => ({ value: item.id, label: item.description }))}
                                            onChange={(selected) => {
                                                const ids = selected ? selected.map(s => s.value) : [];
                                                handleChange('d2dItemIds', ids);
                                            }}
                                            placeholder="Seleccionar items..."
                                            isClearable
                                            styles={selectStyles}
                                            menuPortalTarget={document.body}
                                            menuPosition="fixed"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Peso (kg) <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.01" value={form.weight}
                                                onChange={e => handleChange('weight', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad <span className="text-red-500">*</span></label>
                                            <input type="number" min="1" value={form.quantity}
                                                onChange={e => handleChange('quantity', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">CBM <span className="text-red-500">*</span></label>
                                            <input type="number" step="0.001" value={form.cbm}
                                                onChange={e => handleChange('cbm', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0.000" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">CST <span className="text-red-500">*</span></label>
                                            <input type="text" value={form.cst}
                                                onChange={e => handleChange('cst', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="Ej: CST-12345" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Número de Consolidado</label>
                                            <input type="text" value={form.consolidadoManual}
                                                onChange={e => handleChange('consolidadoManual', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="Ej: CONS-001" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETA <span className="text-red-500">*</span></label>
                                            <input type="date" value={form.d2dEta}
                                                onChange={e => handleChange('d2dEta', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Tiempo de Travesía (días) <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" value={form.d2dTransitTime}
                                                onChange={e => handleChange('d2dTransitTime', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="Ej: 15" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Aliado <span className="text-red-500">*</span></label>
                                            <Select
                                                options={allies.map(a => ({ value: a.id, label: a.name }))}
                                                value={allies.find(a => a.id === form.d2dAliadoId) ? { value: form.d2dAliadoId, label: allies.find(a => a.id === form.d2dAliadoId).name } : null}
                                                onChange={opt => handleChange('d2dAliadoId', opt?.value || '')}
                                                placeholder="Seleccionar..."
                                                isClearable
                                                styles={selectStyles}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Campos CONSOLIDADO ── */}
                            {form.type === 'CONSOLIDADO' && (
                                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                                        <Package size={16} /> Datos Consolidado
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Número de Consolidado <span className="text-red-500">*</span></label>
                                            <input type="text" value={form.consolidadoNumber}
                                                onChange={e => handleChange('consolidadoNumber', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                placeholder="Ej: CONS-2024-001" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto de llegada <span className="text-red-500">*</span></label>
                                            <Select
                                                options={portOptions}
                                                value={basePortOptions.find(o => o.value === form.arrivalPort) || null}
                                                onChange={(opt) => {
                                                    if (opt?.value === 'NEW') { setQuickCreateType('PORT_DESTINATION'); return; }
                                                    handleChange('arrivalPort', opt?.value || '');
                                                }}
                                                placeholder="Seleccionar puerto..."
                                                isClearable
                                                styles={{
                                                    ...selectStyles,
                                                    option: (base, state) => ({
                                                        ...base,
                                                        color: state.data.isAction ? '#12284bff' : base.color,
                                                        fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                                        borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                                    })
                                                }}
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETD <span className="text-red-500">*</span></label>
                                            <input type="date" value={form.etd}
                                                onChange={e => handleChange('etd', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETA <span className="text-red-500">*</span></label>
                                            <input type="date" value={form.eta}
                                                onChange={e => handleChange('eta', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Tiempo de Travesía (días) <span className="text-red-500">*</span></label>
                                            <input type="number" min="0" value={form.consolidadoTransitTime}
                                                onChange={e => handleChange('consolidadoTransitTime', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                placeholder="Ej: 45" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button type="button" onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving || loading}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-sky-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {saving
                            ? <><Loader2 className="animate-spin" size={18} /> Guardando...</>
                            : isEdit ? 'Guardar Cambios' : 'Crear Embarque'
                        }
                    </button>
                </div>
            </div>

            {/* Quick Create Modals */}
            <QuickCreatePortModal
                isOpen={quickCreateType === 'PORT_ORIGIN' || quickCreateType === 'PORT_DESTINATION'}
                onClose={() => setQuickCreateType(null)}
                onSuccess={(newPort) => {
                    setPorts(prev => [...prev, { name: newPort.label, id: newPort.value }].sort((a, b) => a.name.localeCompare(b.name)));
                    if (quickCreateType === 'PORT_ORIGIN') {
                        handleChange('originPort', newPort.label);
                    } else if (quickCreateType === 'PORT_DESTINATION') {
                        handleChange('destPort', newPort.label);
                    }
                    setQuickCreateType(null);
                }}
            />

            <QuickCreateShippingLineModal
                isOpen={quickCreateType === 'SHIPPING_LINE'}
                onClose={() => setQuickCreateType(null)}
                onSuccess={(newLine) => {
                    setShippingLines(prev => [...prev, { id: newLine.value, name: newLine.label }].sort((a, b) => a.name.localeCompare(b.name)));
                    handleChange('shippingLineId', newLine.value);
                    setQuickCreateType(null);
                }}
            />

            <QuickCreateAirLineModal
                isOpen={quickCreateType === 'AIR_LINE'}
                onClose={() => setQuickCreateType(null)}
                onSuccess={(newLine) => {
                    setAirLines(prev => [...prev, newLine.data].sort((a, b) => a.name.localeCompare(b.name)));
                    handleChange('airLineId', newLine.value);
                    setQuickCreateType(null);
                }}
            />
        </div>,
        document.body
    );
};

export default ShipmentFormModal;
