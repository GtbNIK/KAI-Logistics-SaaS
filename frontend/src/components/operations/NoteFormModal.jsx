import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScrollText, X, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const NoteFormModal = ({ isOpen, onClose, onSuccess, editNote = null }) => {
    const [clients, setClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [deliveredTo, setDeliveredTo] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();

    const [clientInputValue, setClientInputValue] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);

    const clientOptions = clients.map(c => ({ value: c.id, label: `${c.name} — ${c.rifOrId}` }));

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
    }, [clientInputValue, clients]);

    useEffect(() => {
        if (!isOpen) return;
        axios.get(`${API_URL}/clients?all=true`, { withCredentials: true })
            .then(res => setClients(res.data.data || []))
            .catch(() => {});

        if (editNote) {
            setClientId(editNote.clientId || '');
            setDeliveredTo(editNote.deliveredTo || '');
            setDeliveryAddress(editNote.deliveryAddress || '');
            setNotes(editNote.notes || '');
            setItems(editNote.items?.length > 0
                ? editNote.items.map(i => ({
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    totalPrice: Number(i.totalPrice)
                }))
                : [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
            );
        } else {
            setClientId('');
            setDeliveredTo('');
            setDeliveryAddress('');
            setNotes('');
            setItems([{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
        }
        setClientInputValue('');
    }, [isOpen, editNote]);

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            updated[index].totalPrice = Number(updated[index].quantity) * Number(updated[index].unitPrice);
        }
        setItems(updated);
    };

    const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!clientId) return showError('Error', 'Selecciona un cliente');
        if (items.some(i => !i.description.trim())) return showError('Error', 'Todos los items deben tener descripción');
        if (items.some(i => Number(i.unitPrice) <= 0)) return showError('Error', 'El precio unitario no puede ser negativo o igual a cero');

        setSaving(true);
        try {
            const data = { clientId, deliveredTo, deliveryAddress, notes, items };
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

    const total = items.reduce((acc, i) => acc + Number(i.totalPrice || 0), 0);

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
                            styles={{
                                control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#e2e8f0', minHeight: '44px', '&:hover': { borderColor: '#10b981' } }),
                                menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden', zIndex: 50 }),
                            }}
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de entrega</label>
                            <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Dirección puntual" />
                        </div>
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
                                <input type="text" placeholder="Descripción del servicio *" value={item.description}
                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">Cantidad</label>
                                        <input type="number" min="1" step="0.01" value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Precio Unit. ($)</label>
                                        <input type="number" min="0" step="0.01" value={item.unitPrice}
                                            onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Total ($)</label>
                                        <input type="text" readOnly value={`$${Number(item.totalPrice || 0).toFixed(2)}`}
                                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700" />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end">
                            <div className="bg-slate-800 text-white px-5 py-2 rounded-lg text-sm">
                                Total: <span className="font-bold text-lg">${total.toFixed(2)}</span>
                            </div>
                        </div>
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
        </div>,
        document.body
    );
};

export default NoteFormModal;
