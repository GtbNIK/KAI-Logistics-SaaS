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
        containerType: '',
        containerQty: '',
        originPort: '',
        destPort: '',
        etd: '',
        eta: '',
        // D2D
        weight: '',
        quantity: '',
        cbm: '',
    });

    // Cargar catálogos
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [notices, usersData, clientsData, shippingLinesData, portsData, airLinesData] = await Promise.all([
                    shipmentService.getAvailableNotices(),
                    shipmentService.getVendedores(),
                    shipmentService.getClients(),
                    shipmentService.getShippingLines(),
                    shipmentService.getPorts(),
                    airlineService.getAirLines()
                ]);
                setAvailableNotices(Array.isArray(notices) ? notices : []);
                setUsers(Array.isArray(usersData) ? usersData : []);
                setClients(Array.isArray(clientsData) ? clientsData : []);
                setShippingLines(Array.isArray(shippingLinesData) ? shippingLinesData : []);
                setPorts(Array.isArray(portsData) ? portsData : []);
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
                originPort: shipment.originPort || '',
                destPort: shipment.destPort || '',
                etd: shipment.etd ? shipment.etd.slice(0, 10) : '',
                eta: shipment.eta ? shipment.eta.slice(0, 10) : '',
                weight: shipment.weight || '',
                quantity: shipment.quantity || '',
                cbm: shipment.cbm || '',
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


    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
                                <div className="flex gap-3">
                                    <button type="button"
                                        onClick={() => !isEdit && handleChange('type', 'FCL')}
                                        disabled={isEdit}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                            isFCL
                                                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        } ${isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Container size={18} /> FCL
                                    </button>
                                    <button type="button"
                                        onClick={() => !isEdit && handleChange('type', 'D2D')}
                                        disabled={isEdit}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                            !isFCL
                                                ? 'border-teal-400 bg-teal-50 text-teal-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        } ${isEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <Package size={18} /> Door to Door
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
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
                                <label className="block text-xs font-medium text-slate-500 mb-1">Vendedor</label>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        {form.type === 'D2D' ? 'Nro. Warehouse' : 'Nro. BL'}
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
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nro. Booking</label>
                                        <input type="text" value={form.bookingNumber}
                                            onChange={e => handleChange('bookingNumber', e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-200"
                                            placeholder="BOOK-000..." />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">
                                        {isFCL ? 'Línea Naviera' : 'Línea Aérea'}
                                    </label>
                                    {isFCL ? (
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
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                                    <select value={form.status}
                                        onChange={e => handleChange('status', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Ubicación actual */}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Ubicación actual (opcional)</label>
                                <input type="text" value={form.currentLocation}
                                    onChange={e => handleChange('currentLocation', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                                    placeholder="Ej: En tránsito - Puerto de Shanghai" />
                            </div>

                            {/* ── Campos FCL ── */}
                            {isFCL && (
                                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                                        <Container size={16} /> Datos FCL
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo Contenedor</label>
                                            <select value={form.containerType}
                                                onChange={e => handleChange('containerType', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200">
                                                <option value="">Seleccionar...</option>
                                                {CONTAINER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                                            <input type="number" min="1" value={form.containerQty}
                                                onChange={e => handleChange('containerQty', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                placeholder="1" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Origen</label>
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
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Destino</label>
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
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETD (Salida estimada)</label>
                                            <input type="date" value={form.etd}
                                                onChange={e => handleChange('etd', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">ETA (Llegada estimada)</label>
                                            <input type="date" value={form.eta}
                                                onChange={e => handleChange('eta', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Campos D2D ── */}
                            {!isFCL && (
                                <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 space-y-4">
                                    <h4 className="text-sm font-semibold text-teal-700 flex items-center gap-2">
                                        <Package size={16} /> Datos Door to Door
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Puerto Origen</label>
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
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Peso (kg)</label>
                                            <input type="number" step="0.01" value={form.weight}
                                                onChange={e => handleChange('weight', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                                            <input type="number" min="1" value={form.quantity}
                                                onChange={e => handleChange('quantity', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">CBM</label>
                                            <input type="number" step="0.001" value={form.cbm}
                                                onChange={e => handleChange('cbm', e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200"
                                                placeholder="0.000" />
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
