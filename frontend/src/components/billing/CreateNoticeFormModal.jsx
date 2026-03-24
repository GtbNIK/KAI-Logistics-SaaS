import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, X, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Tipos de servicio que usan zona (los demás usan ruta con puertos)
const ZONE_SERVICE_TYPES = ['DOOR_TO_DOOR', 'WAREHOUSE', 'CUSTOMS', 'OTHER'];

// Estilos base compartidos para todos los react-select del modal.
// Se usa menuPortalTarget={document.body} para que el dropdown se renderice
// fuera del contenedor con overflow-hidden y no quede tapado por el footer.
const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.5rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

// Estilos del select de cliente (un poco más alto)
const clientSelectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '44px', '&:hover': { borderColor: '#3b82f6' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const emptyItem = () => ({
    serviceId: '',
    allyId: '',
    zoneId: '',
    originPort: '',
    destinationPort: '',
    quantity: 1,
    unitPrice: '',
    description: '',
});

const CreateNoticeFormModal = ({ isOpen, onClose, onSuccess }) => {
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [allies, setAllies] = useState([]);
    const [zones, setZones] = useState([]);
    const [ports, setPorts] = useState([]);

    const [clientId, setClientId] = useState('');
    const [clientInputValue, setClientInputValue] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([emptyItem()]);
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();

    // ── Opciones de selects ──
    const clientOptions = useMemo(() =>
        (clients || []).map(c => ({ value: c.id, label: `${c.name} — ${c.rifOrId}` })),
        [clients]
    );

    const filteredClients = useMemo(() => {
        if (!clientInputValue.trim()) return clientOptions;
        const search = clientInputValue.toLowerCase();
        return clientOptions.filter(c => c.label.toLowerCase().includes(search));
    }, [clientOptions, clientInputValue]);

    const serviceOptions = useMemo(() =>
        (services || []).filter(s => s.isActive).map(s => ({ value: s.id, label: s.name, type: s.type })),
        [services]
    );

    const allyOptions = useMemo(() =>
        (allies || []).filter(a => a.isActive !== false).map(a => ({ value: a.id, label: a.name })),
        [allies]
    );

    const zoneOptions = useMemo(() =>
        (zones || []).filter(z => z.isActive !== false).map(z => ({ value: z.id, label: z.name })),
        [zones]
    );

    // Puertos: solo mostrar el nombre (sin código)
    const portOptions = useMemo(() =>
        (ports || []).filter(p => p.isActive !== false).map(p => ({ value: p.code, label: p.name })),
        [ports]
    );

    // ── Carga de catálogos al abrir ──
    useEffect(() => {
        if (!isOpen) return;

        const fetchAll = async () => {
            try {
                const [cRes, sRes, aRes, zRes, pRes] = await Promise.all([
                    axios.get(`${API_URL}/clients?all=true`, { withCredentials: true }),
                    axios.get(`${API_URL}/services`, { withCredentials: true }),
                    axios.get(`${API_URL}/allies`, { withCredentials: true }),
                    axios.get(`${API_URL}/zones`, { withCredentials: true }),
                    axios.get(`${API_URL}/ports`, { withCredentials: true }),
                ]);
                setClients(cRes.data.data || []);
                setServices(sRes.data.data || sRes.data || []);
                setAllies(aRes.data.data || aRes.data || []);
                setZones(zRes.data.data || zRes.data || []);
                setPorts(pRes.data.data || pRes.data || []);
            } catch {
                showError('Error', 'No se pudieron cargar los catálogos');
            }
        };

        fetchAll();

        // Reset form
        setClientId('');
        setClientInputValue('');
        setNotes('');
        setItems([emptyItem()]);
    }, [isOpen]);

    // ── Helpers de items ──
    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        // Si cambia el servicio, limpiar zona/ruta
        if (field === 'serviceId') {
            updated[index].zoneId = '';
            updated[index].originPort = '';
            updated[index].destinationPort = '';
        }
        setItems(updated);
    };

    const addItem = () => setItems([...items, emptyItem()]);
    const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const getServiceType = (serviceId) => {
        const svc = services.find(s => s.id === serviceId);
        return svc?.type || null;
    };

    const isZoneService = (serviceId) => {
        const type = getServiceType(serviceId);
        return type ? ZONE_SERVICE_TYPES.includes(type) : true; // default zona si aún no se selecciona
    };

    // DOOR_TO_DOOR: campo cantidad se muestra como CBM
    const isDoorToDoor = (serviceId) => getServiceType(serviceId) === 'DOOR_TO_DOOR';

    // ── Cálculos ──
    const getItemTotal = (item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return qty * price;
    };

    const grandTotal = items.reduce((acc, item) => acc + getItemTotal(item), 0);

    // ── Submit ──
    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!clientId) return showError('Validación', 'Selecciona un cliente');
        if (items.some(i => !i.serviceId)) return showError('Validación', 'Todos los items deben tener un servicio seleccionado');
        if (items.some(i => !i.unitPrice || Number(i.unitPrice) <= 0)) return showError('Validación', 'Todos los items deben tener un precio válido');

        setSaving(true);
        try {
            await axios.post(`${API_URL}/payment-notices`, {
                clientId,
                notes: notes || undefined,
                items: items.map(item => ({
                    serviceId: item.serviceId,
                    allyId: item.allyId || undefined,
                    zoneId: item.zoneId || undefined,
                    originPort: item.originPort || undefined,
                    destinationPort: item.destinationPort || undefined,
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice),
                    description: item.description || undefined,
                })),
            }, { withCredentials: true });

            showSuccess('¡Creado!', 'Aviso de Cobro creado exitosamente');
            onSuccess?.();
            onClose?.();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'No se pudo crear el aviso de cobro');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Receipt className="text-blue-600" size={22} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            Nuevo Aviso de Cobro
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Cliente */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                        <Select
                            options={filteredClients}
                            value={clientOptions.find(c => c.value === clientId) || null}
                            placeholder="Buscar cliente..."
                            onChange={(opt) => setClientId(opt?.value || '')}
                            onInputChange={(val) => setClientInputValue(val)}
                            filterOption={() => true}
                            noOptionsMessage={() => 'Sin resultados'}
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={clientSelectStyles}
                        />
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas <span className="text-slate-400">(opcional)</span></label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            rows={2} placeholder="Observaciones adicionales..." />
                    </div>

					{/* Items / Servicios */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Servicios</p>
                            <button type="button" onClick={addItem} className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                                <Plus size={16} /> Agregar
                            </button>
                        </div>

                            {items.map((item, idx) => {
                                const showZone = isZoneService(item.serviceId);
                                const isD2D = isDoorToDoor(item.serviceId);
                                return (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-400">Servicio #{idx + 1}</span>
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Servicio */}
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Servicio *</label>
                                            <Select
                                                options={serviceOptions}
                                                value={serviceOptions.find(o => o.value === item.serviceId) || null}
                                                placeholder="Selecciona un servicio..."
                                                onChange={(opt) => updateItem(idx, 'serviceId', opt?.value || '')}
                                                isClearable
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                                styles={selectStyles}
                                            />
                                        </div>

                                        {/* Aliado */}
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Aliado <span className="text-slate-300">(opcional)</span></label>
                                            <Select
                                                options={allyOptions}
                                                value={allyOptions.find(o => o.value === item.allyId) || null}
                                                placeholder="Selecciona un aliado..."
                                                onChange={(opt) => updateItem(idx, 'allyId', opt?.value || '')}
                                                isClearable
                                                menuPortalTarget={document.body}
                                                menuPosition="fixed"
                                                styles={selectStyles}
                                            />
                                        </div>

                                        {/* Zona o Ruta según tipo de servicio */}
                                        {item.serviceId && (
                                            showZone ? (
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Zona <span className="text-slate-300">(opcional)</span></label>
                                                    <Select
                                                        options={zoneOptions}
                                                        value={zoneOptions.find(o => o.value === item.zoneId) || null}
                                                        placeholder="Selecciona una zona..."
                                                        onChange={(opt) => updateItem(idx, 'zoneId', opt?.value || '')}
                                                        isClearable
                                                        menuPortalTarget={document.body}
                                                        menuPosition="fixed"
                                                        styles={selectStyles}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-slate-500 mb-1 block">Puerto Origen</label>
                                                        <Select
                                                            options={portOptions}
                                                            value={portOptions.find(o => o.value === item.originPort) || null}
                                                            placeholder="Origen..."
                                                            onChange={(opt) => updateItem(idx, 'originPort', opt?.value || '')}
                                                            isClearable
                                                            menuPortalTarget={document.body}
                                                            menuPosition="fixed"
                                                            styles={selectStyles}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-slate-500 mb-1 block">Puerto Destino</label>
                                                        <Select
                                                            options={portOptions}
                                                            value={portOptions.find(o => o.value === item.destinationPort) || null}
                                                            placeholder="Destino..."
                                                            onChange={(opt) => updateItem(idx, 'destinationPort', opt?.value || '')}
                                                            isClearable
                                                            menuPortalTarget={document.body}
                                                            menuPosition="fixed"
                                                            styles={selectStyles}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* Cantidad / CBM, Precio, Total */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500">{isD2D ? 'CBM' : 'Cantidad'}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step={isD2D ? '0.001' : '0.01'}
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Precio Unit. (USD) *</label>
                                                <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 bg-white">
                                                    <span className="text-slate-400 text-sm">$</span>
                                                    <input type="number" min="0" step="0.01" value={item.unitPrice}
                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                        className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800 font-semibold"
                                                        placeholder="0.00" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500">Total</label>
                                                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                                                    ${getItemTotal(item).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Total General */}
                    <div className="flex justify-end">
                        <div className="bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-4">
                            <span className="text-slate-300 text-sm font-medium">TOTAL</span>
                            <span className="text-xl font-bold">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : <><Check size={18} /> Crear Aviso de Cobro</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateNoticeFormModal;
