import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ScrollText, X, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import QuickCreateD2DItemModal from '../shared/QuickCreateD2DItemModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Estilos base compartidos para todos los react-select del modal.
const selectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.5rem', borderColor: '#e2e8f0', minHeight: '40px', '&:hover': { borderColor: '#10b981' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const clientSelectStyles = {
    control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '44px', '&:hover': { borderColor: '#10b981' } }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
};

const NoteFormModal = ({ isOpen, onClose, onSuccess, editNote = null }) => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [deliveredTo, setDeliveredTo] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [warehouseNumber, setWarehouseNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ d2dItemId: null, description: '', quantity: 1, weight: '', cbm: '' }]);
    const [d2dItems, setD2dItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();
    const [quickCreateModalOpen, setQuickCreateModalOpen] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(null);

    const [clientInputValue, setClientInputValue] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);

    const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: `${c.name} — ${c.rifOrId}` })), [clients]);

    useEffect(() => {
        if (!clientInputValue.trim()) {
            setFilteredClients(clientOptions);
            return;
        }
        const t = setTimeout(() => {
            const search = clientInputValue.toLowerCase();
            setFilteredClients(clientOptions.filter(c => c.label.toLowerCase().includes(search)));
        }, 800);
        return () => clearTimeout(t);
    }, [clientInputValue, clientOptions]);

    useEffect(() => {
        if (!isOpen) return;
        axios.get(`${API_URL}/clients?all=true`, { withCredentials: true })
            .then(res => setClients(res.data.data || []))
            .catch(() => {});

        axios.get(`${API_URL}/d2d-items?all=true`, { withCredentials: true })
            .then(res => setD2dItems(res.data.data || []))
            .catch(() => {});

        if (editNote) {
            setClientId(editNote.clientId || '');
            setDeliveredTo(editNote.deliveredTo || '');
            setContactPhone(editNote.contactPhone || '');
            setDeliveryAddress(editNote.deliveryAddress || '');
            setWarehouseNumber(editNote.warehouseNumber || '');
            setNotes(editNote.notes || '');
            setItems(editNote.items?.length > 0
                ? editNote.items.map(i => ({
                    d2dItemId: i.d2dItemId ?? null,
                    description: i.description,
                    quantity: Number(i.quantity),
                    weight: i.weight ?? '',
                    cbm: i.cbm ?? ''
                }))
                : [{ d2dItemId: null, description: '', quantity: 1, weight: '', cbm: '' }]
            );
        } else {
            setClientId('');
            setDeliveredTo('');
            setContactPhone('');
            setDeliveryAddress('');
            setWarehouseNumber('');
            setNotes('');
            setItems([{ d2dItemId: null, description: '', quantity: 1, weight: '', cbm: '' }]);
        }
        setClientInputValue('');
    }, [isOpen, editNote]);

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;
        setItems(updated);
    };

    const addItem = () => setItems([...items, { d2dItemId: null, description: '', quantity: 1, weight: '', cbm: '' }]);
    const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    // Opciones de D2D items con "Agregar nuevo" solo para ADMIN
    const baseD2dItemOptions = d2dItems.map(i => ({ value: i.id, label: i.description }));
    const d2dItemOptions = user?.role === 'ADMIN'
        ? [...baseD2dItemOptions, { value: 'NEW', label: '+ Agregar nuevo item', isAction: true }]
        : baseD2dItemOptions;

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!clientId) return showError('Error', 'Selecciona un cliente');
        if (!warehouseNumber.trim()) return showError('Error', 'El número de Warehouse es obligatorio');
        if (items.some(i => !i.description.trim())) return showError('Error', 'Todos los items deben tener descripción');
        if (items.some(i => !i.weight || Number(i.weight) <= 0)) return showError('Error', 'Todos los items deben tener un peso válido (mayor a 0)');
        if (items.some(i => !i.cbm || Number(i.cbm) <= 0)) return showError('Error', 'Todos los items deben tener un CBM válido (mayor a 0)');

        setSaving(true);
        try {
            const data = { clientId, deliveredTo, contactPhone, deliveryAddress, warehouseNumber, notes, items };
            if (editNote) {
                await axios.put(`${API_URL}/delivery-notes/${editNote.id}`, data, { withCredentials: true });
                showSuccess('Actualizada', 'Nota de entrega actualizada correctamente');
            } else {
                await axios.post(`${API_URL}/delivery-notes`, data, { withCredentials: true });
                showSuccess('Creada', 'Nota de entrega creada correctamente');
            }
            onSuccess();
            onClose();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al guardar nota de entrega');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <ScrollText className="text-emerald-600" size={22} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">
                            {editNote ? 'Editar Nota de Entrega' : 'Nueva Nota de Entrega'}
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

                    {/* Entrega */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recibido por</label>
                            <input type="text" value={deliveredTo} onChange={e => setDeliveredTo(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Nombre del receptor" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono de contacto</label>
                            <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Número de teléfono" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de entrega</label>
                        <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Dirección puntual" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Número de Warehouse <span className="text-red-500">*</span></label>
                        <input type="text" value={warehouseNumber} onChange={e => setWarehouseNumber(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Ej: WH-12345" required />
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            rows={2} placeholder="Observaciones adicionales..." />
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Items / Servicios</p>
                            <button type="button" onClick={addItem} className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1">
                                <Plus size={16} /> Agregar
                            </button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">Item #{idx + 1}</span>
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <Select 
                                    options={d2dItemOptions}
                                    value={baseD2dItemOptions.find(o => o.value === item.d2dItemId) || null}
                                    placeholder="Descripción del servicio *"
                                    isClearable
                                    onChange={(opt) => {
                                        if (opt?.value === 'NEW') {
                                            setCurrentItemIndex(idx);
                                            setQuickCreateModalOpen(true);
                                            return;
                                        }
                                        updateItem(idx, 'd2dItemId', opt?.value || null);
                                        updateItem(idx, 'description', opt?.label || '');
                                    }}
                                    menuPortalTarget={document.body}
                                    menuPosition="fixed"
                                    styles={{
                                        ...selectStyles,
                                        option: (base, state) => ({
                                            ...base,
                                            color: state.data.isAction ? '#12284bff' : base.color,
                                            fontWeight: state.data.isAction ? 'bold' : base.fontWeight,
                                            borderTop: state.data.isAction ? '1px solid #e2e8f0' : 'none'
                                        })
                                    }}
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">Cantidad</label>
                                        <input type="number" min="1" step="0.01" value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
									<label className="text-xs text-slate-400">Peso (KG) <span className="text-red-500">*</span></label>
									<input type="number" min="0" step="0.01" value={item.weight}
										onChange={e => updateItem(idx, 'weight', e.target.value)}
										className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
									<label className="text-xs text-slate-400">CBM <span className="text-red-500">*</span></label>
									<input type="number" min="0" step="0.001" value={item.cbm}
										onChange={e => updateItem(idx, 'cbm', e.target.value)}
										className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {saving ? <><Loader2 className="animate-spin" size={18} /> Guardando...</> : <><Check size={18} /> {editNote ? 'Actualizar' : 'Crear Nota'}</>}
                    </button>
                </div>
            </div>

            {/* Quick Create Modal */}
            <QuickCreateD2DItemModal
                isOpen={quickCreateModalOpen}
                onClose={() => {
                    setQuickCreateModalOpen(false);
                    setCurrentItemIndex(null);
                }}
                onSuccess={(newItem) => {
                    setD2dItems(prev => [...prev, { id: newItem.value, description: newItem.label }].sort((a, b) => a.description.localeCompare(b.description)));
                    if (currentItemIndex !== null) {
                        updateItem(currentItemIndex, 'd2dItemId', newItem.value);
                        updateItem(currentItemIndex, 'description', newItem.label);
                    }
                    setQuickCreateModalOpen(false);
                    setCurrentItemIndex(null);
                }}
            />
        </div>,
        document.body
    );
};

export default NoteFormModal;
