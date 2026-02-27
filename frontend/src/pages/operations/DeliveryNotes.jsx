import { useState, useEffect, useCallback } from 'react';
import {
    ScrollText, DollarSign, Package, FileText, User, Calendar,
    X, Loader2, Plus, Trash2, MapPin, Check, Truck, Ban
} from 'lucide-react';
import axios from 'axios';
import Select from 'react-select';
import { useToast } from '../../context/ToastContext';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import { deliveryNoteConfig } from '../../config/deliveryNoteConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ─── Hook de datos ────────────────────────────────────────────────────────────
const useDeliveryNotes = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); }, 1200);
        return () => clearTimeout(t);
    }, [search]);

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 10, search: debouncedSearch });
            const res = await axios.get(`${API_URL}/delivery-notes?${params}`, { withCredentials: true });
            setItems(res.data.data || []);
            setTotalItems(res.data.meta?.total || 0);
            setTotalPages(res.data.meta?.totalPages || 1);
        } catch {
            showError('Error', 'No se pudieron cargar las notas de entrega');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    return { items, loading, page, setPage, totalPages, totalItems, search, setSearch, refresh: fetchNotes };
};

// ─── Modal de detalle ─────────────────────────────────────────────────────────
const NoteDetailModal = ({ note, onClose }) => {
    if (!note) return null;
    const n = note;

    const statusMap = {
        DRAFT:      { label: 'Borrador',   color: 'bg-slate-100 text-slate-600' },
        DISPATCHED: { label: 'Despachada', color: 'bg-blue-100 text-blue-600' },
        DELIVERED:  { label: 'Entregada',  color: 'bg-green-100 text-green-600' },
        CANCELLED:  { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
    };
    const statusCfg = statusMap[n.status] || statusMap.DRAFT;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <ScrollText className="text-emerald-600" size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                NDE-{String(n.number).padStart(5, '0')}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Info general */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <User className="text-slate-400 mt-0.5" size={18} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Cliente</p>
                                <p className="font-medium text-slate-800">{n.client?.name || 'N/A'}</p>
                                <p className="text-xs text-slate-500">{n.client?.rifOrId}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <Calendar className="text-slate-400 mt-0.5" size={18} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Fecha</p>
                                <p className="font-medium text-slate-800">
                                    {new Date(n.date).toLocaleDateString('es-VE')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {n.deliveredTo && (
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <User className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Recibido por</p>
                                <p className="font-medium text-slate-800">{n.deliveredTo}</p>
                            </div>
                        </div>
                    )}

                    {n.deliveryAddress && (
                        <div className="p-4 bg-slate-50 rounded-xl flex items-start gap-3">
                            <MapPin className="text-slate-400 mt-0.5" size={16} />
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Dirección de entrega</p>
                                <p className="font-medium text-slate-800">{n.deliveryAddress}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    {n.items && n.items.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Package size={14} /> Servicios / Items
                            </p>
                            <div className="space-y-2">
                                {n.items.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{item.description}</p>
                                            <p className="text-xs text-slate-400">
                                                {Number(item.quantity)} × ${parseFloat(item.unitPrice).toFixed(2)}
                                            </p>
                                        </div>
                                        <span className="font-bold text-slate-700 whitespace-nowrap ml-4">
                                            ${parseFloat(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {n.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-amber-600 mb-1">Notas</p>
                            <p className="text-sm text-slate-700">{n.notes}</p>
                        </div>
                    )}

                    {/* Aviso de cobro asociado */}
                    {n.paymentNotice && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-purple-600 mb-1">Aviso de Cobro Generado</p>
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-purple-50 text-purple-600 border-purple-200">
                                AVC-{String(n.paymentNotice.number).padStart(5, '0')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer total */}
                {n.items && n.items.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-800 text-white flex items-center justify-between rounded-b-2xl">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <DollarSign size={16} /> Total
                        </span>
                        <span className="text-2xl font-bold">
                            ${n.items.reduce((acc, i) => acc + parseFloat(i.totalPrice || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Modal de creación / edición ──────────────────────────────────────────────
const NoteFormModal = ({ isOpen, onClose, onSuccess, editNote = null }) => {
    const [clients, setClients] = useState([]);
    const [clientId, setClientId] = useState('');
    const [deliveredTo, setDeliveredTo] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();

    // Debounce para búsqueda de clientes
    const [clientInputValue, setClientInputValue] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);

    // Transformar clientes a formato react-select
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
        // Cargar clientes
        axios.get(`${API_URL}/clients?all=true`, { withCredentials: true })
            .then(res => setClients(res.data.data || []))
            .catch(() => {});

        // Si es edición, cargar datos
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

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
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
                                control: (base) => ({
                                    ...base,
                                    borderRadius: '0.75rem',
                                    borderColor: '#e2e8f0',
                                    minHeight: '44px',
                                    '&:hover': { borderColor: '#10b981' },
                                }),
                                menu: (base) => ({
                                    ...base,
                                    borderRadius: '0.75rem',
                                    overflow: 'hidden',
                                    zIndex: 50,
                                }),
                            }}
                        />
                    </div>

                    {/* Entrega */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Recibido por</label>
                            <input
                                type="text"
                                value={deliveredTo}
                                onChange={e => setDeliveredTo(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Nombre del receptor"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección de entrega</label>
                            <input
                                type="text"
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Dirección puntual"
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            rows={2}
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700">Items / Servicios</p>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
                            >
                                <Plus size={16} /> Agregar
                            </button>
                        </div>

                        {items.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">Item #{idx + 1}</span>
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(idx)}
                                            className="text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Descripción del servicio *"
                                    value={item.description}
                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-400">Cantidad</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Precio Unit. ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Total ($)</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={`$${Number(item.totalPrice || 0).toFixed(2)}`}
                                            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Total */}
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
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin" size={18} /> Guardando...</>
                        ) : (
                            <><Check size={18} /> {editNote ? 'Actualizar' : 'Crear Nota'}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Modal de Finalización ────────────────────────────────────────────────────
const FinalizeModal = ({ isOpen, onClose, note, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();

    if (!isOpen || !note) return null;

    const total = (note.items || []).reduce((acc, i) => acc + Number(i.totalPrice || 0), 0);

    const handleFinalize = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/delivery-notes/${note.id}/finalize`, {}, { withCredentials: true });
            showSuccess('Finalizada', 'Nota de entrega cerrada. Se generó el Aviso de Cobro y la Cuenta por Cobrar.');
            onSuccess();
            onClose();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al finalizar la nota');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-xl">
                        <Check className="text-green-600" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Confirmar Entrega</h3>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-600">
                        Al confirmar la entrega de <strong>NDE-{String(note.number).padStart(5, '0')}</strong>, 
                        se generará automáticamente:
                    </p>
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-2">
                            <FileText className="text-purple-500" size={16} />
                            Un <strong>Aviso de Cobro</strong> por <span className="font-bold">${total.toFixed(2)}</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <DollarSign className="text-emerald-500" size={16} />
                            Una <strong>Cuenta por Cobrar</strong> asociada al cliente
                        </li>
                    </ul>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                        ⚠️ Esta acción no se puede deshacer. La nota quedará en estado <strong>Entregada</strong>.
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} disabled={loading}
                        className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleFinalize} disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        {loading ? (
                            <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                            <><Check size={18} /> Confirmar Entrega</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const DeliveryNotes = () => {
    const [viewingNote, setViewingNote] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [deletingNote, setDeletingNote] = useState(null);
    const [finalizingNote, setFinalizingNote] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const { showSuccess, showError } = useToast();
    const {
        items, loading, page, setPage, totalPages, totalItems,
        search, setSearch, refresh
    } = useDeliveryNotes();

    const handleEdit = (item) => {
        if (item.status !== 'DRAFT') {
            return showError('No permitido', 'Solo se pueden editar notas en estado Borrador');
        }
        setEditingNote(item);
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingNote) return;
        setDeleteLoading(true);
        try {
            await axios.delete(`${API_URL}/delivery-notes/${deletingNote.id}`, { withCredentials: true });
            showSuccess('Eliminada', 'Nota de entrega eliminada correctamente');
            setDeletingNote(null);
            refresh();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al eliminar');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleStatusChange = async (item, newStatus) => {
        try {
            await axios.patch(`${API_URL}/delivery-notes/${item.id}/status`, { status: newStatus }, { withCredentials: true });
            showSuccess('Estado actualizado', `Nota marcada como ${newStatus === 'DISPATCHED' ? 'Despachada' : newStatus === 'CANCELLED' ? 'Cancelada' : newStatus}`);
            refresh();
        } catch (err) {
            showError('Error', err.response?.data?.message || 'Error al cambiar estado');
        }
    };

    // Acciones extra por fila según estado
    const renderExtraActions = (item) => {
        const actions = [];

        if (item.status === 'DRAFT') {
            actions.push(
                <button
                    key="dispatch"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'DISPATCHED'); }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Marcar como Despachada"
                >
                    <Truck size={16} />
                </button>
            );
            actions.push(
                <button
                    key="cancel"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'CANCELLED'); }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar nota"
                >
                    <Ban size={14} />
                </button>
            );
        }

        if (item.status === 'DISPATCHED' && !item.paymentNotice) {
            actions.push(
                <button
                    key="finalize"
                    onClick={(e) => { e.stopPropagation(); setFinalizingNote(item); }}
                    className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    title="Confirmar Entrega (Genera Aviso de Cobro)"
                >
                    <Check size={16} />
                </button>
            );
            actions.push(
                <button
                    key="cancel2"
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(item, 'CANCELLED'); }}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    title="Cancelar nota"
                >
                    <Ban size={14} />
                </button>
            );
        }

        return actions.length > 0 ? <div className="flex gap-1">{actions}</div> : null;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ScrollText className="text-emerald-600" />
                        Notas de Entrega
                    </h1>
                    <p className="text-slate-500 mt-1">Gestión de entregas y cierre de operaciones logísticas</p>
                </div>
                <button
                    onClick={() => { setEditingNote(null); setIsFormOpen(true); }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Nueva Nota
                </button>
            </div>

            <EntityTable
                entityName={deliveryNoteConfig.entityName}
                entityNamePlural={deliveryNoteConfig.entityNamePlural}
                columns={deliveryNoteConfig.columns}
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                showStatusFilter={false}
                showToggle={false}
                canEdit={true}
                canDelete={true}
                onView={(item) => setViewingNote(item)}
                onEdit={handleEdit}
                onDelete={(item) => setDeletingNote(item)}
                extraActions={renderExtraActions}
            />

            {/* Modales */}
            {viewingNote && (
                <NoteDetailModal note={viewingNote} onClose={() => setViewingNote(null)} />
            )}

            <NoteFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditingNote(null); }}
                onSuccess={refresh}
                editNote={editingNote}
            />

            <ConfirmDeleteModal
                isOpen={!!deletingNote}
                onClose={() => setDeletingNote(null)}
                onConfirm={handleDelete}
                title="Eliminar Nota de Entrega"
                message="¿Estás seguro de que deseas eliminar esta nota de entrega?"
                itemName={deletingNote ? `NDE-${String(deletingNote.number).padStart(5, '0')}` : ''}
                loading={deleteLoading}
            />

            <FinalizeModal
                isOpen={!!finalizingNote}
                onClose={() => setFinalizingNote(null)}
                note={finalizingNote}
                onSuccess={refresh}
            />
        </div>
    );
};

export default DeliveryNotes;
