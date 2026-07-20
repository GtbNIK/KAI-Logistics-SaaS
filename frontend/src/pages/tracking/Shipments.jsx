import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Plus, Ship, Package, Activity, BarChart2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useEffectiveRole } from '../../hooks/useEffectiveRole';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import { shipmentConfig, buildShipmentColumns } from '../../config/shipmentConfig';
import ShipmentDetailModal from '../../components/tracking/ShipmentDetailModal';
import ChangeShipmentStatusModal from '../../components/tracking/ChangeShipmentStatusModal';
import ShipmentFormModal from '../../components/tracking/ShipmentFormModal';
import PreAlertaModal from '../../components/tracking/PreAlertaModal';
import TrackingMonthlyCloseModal from '../../components/tracking/TrackingMonthlyCloseModal';
import shipmentService from '../../services/shipment.service';
import authService from '../../services/auth.service';
import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';

// ── Status labels para el filtro ─────
const STATUS_OPTIONS = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'AT_ORIGIN_WAREHOUSE', label: 'En Almacén Origen' },
    { value: 'AT_ORIGIN_PORT', label: 'En Puerto Origen' },
    { value: 'ON_VESSEL', label: 'En Tránsito' },
    { value: 'AT_DESTINATION_PORT', label: 'En Puerto Destino' },
    { value: 'CUSTOMS_CLEARANCE', label: 'En Aduana' },
    { value: 'ARRIVED', label: 'Arribado' },
    { value: 'DELIVERED', label: 'Entregado' },
];

// Tabs de tipos (FCL, D2D, CONSOLIDADO)

// ── Hook de datos ─────
const useShipments = ({ loadUsers = false } = {}) => {
    const [items, setItems] = useState([]);
    const [allItems, setAllItems] = useState([]); // Para stats (sin filtros)
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('D2D');
    const [statusFilter, setStatusFilter] = useState('');
    const [vendedorFilter, setVendedorFilter] = useState('');
    const [users, setUsers] = useState([]);
    const { showError } = useToast();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 800);
        return () => clearTimeout(t);
    }, [search]);

    // Fetch de stats: siempre sin filtros
    const fetchAll = useCallback(async () => {
        try {
            const data = await shipmentService.getShipments({});
            setAllItems(data);
        } catch { /* silencioso */ }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await authService.getUsers();
            // El backend puede devolver { users: [...] } o directamente el array
            setUsers(Array.isArray(data) ? data : data.users || []);
        } catch { /* silencioso */ }
    }, []);

    const fetchShipments = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (debouncedSearch) params.search = debouncedSearch;
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            if (vendedorFilter) params.vendedorId = vendedorFilter;
            const data = await shipmentService.getShipments(params);
            setItems(data);
        } catch {
            showError('Error', 'No se pudieron cargar los embarques');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, typeFilter, statusFilter, vendedorFilter, showError]);

    useEffect(() => {
        if (loadUsers) fetchUsers();
    }, [fetchUsers, loadUsers]);
    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { fetchShipments(); }, [fetchShipments]);

    const refresh = useCallback(() => {
        fetchAll();
        fetchShipments();
    }, [fetchAll, fetchShipments]);

    return {
        items, allItems, loading, search, setSearch,
        typeFilter, setTypeFilter, statusFilter, setStatusFilter,
        vendedorFilter, setVendedorFilter, users,
        refresh
    };
};

// ── Estadísticas rápidas ─────
const QuickStats = ({ items }) => {
    const counts = useMemo(() => ({
        PENDING: items.filter(i => i.status === 'PENDING').length,
        AT_ORIGIN_WAREHOUSE: items.filter(i => i.status === 'AT_ORIGIN_WAREHOUSE').length,
        AT_ORIGIN_PORT: items.filter(i => i.status === 'AT_ORIGIN_PORT').length,
        ON_VESSEL: items.filter(i => i.status === 'ON_VESSEL').length,
        AT_DESTINATION_PORT: items.filter(i => i.status === 'AT_DESTINATION_PORT').length,
        CUSTOMS_CLEARANCE: items.filter(i => i.status === 'CUSTOMS_CLEARANCE').length,
        ARRIVED: items.filter(i => i.status === 'ARRIVED').length,
        DELIVERED: items.filter(i => i.status === 'DELIVERED').length,
    }), [items]);

    const cards = [
        { label: 'Pendiente', value: counts.PENDING, cls: 'bg-amber-50 text-amber-600', icon: <Package size={18} className="text-amber-600" /> },
        { label: 'En Almacén Origen', value: counts.AT_ORIGIN_WAREHOUSE, cls: 'bg-orange-50 text-orange-600', icon: <Package size={18} className="text-orange-600" /> },
        { label: 'En Puerto Origen', value: counts.AT_ORIGIN_PORT, cls: 'bg-cyan-50 text-cyan-600', icon: <Container size={18} className="text-cyan-600" /> },
        { label: 'En Tránsito', value: counts.ON_VESSEL, cls: 'bg-blue-50/40 text-blue-600', icon: <Ship size={18} className="text-blue-600" /> },
        { label: 'En Puerto Destino', value: counts.AT_DESTINATION_PORT, cls: 'bg-purple-50 text-purple-600', icon: <Container size={18} className="text-purple-600" /> },
        { label: 'En Aduana', value: counts.CUSTOMS_CLEARANCE, cls: 'bg-pink-50 text-pink-600', icon: <Package size={18} className="text-pink-600" /> },
        { label: 'Arribados', value: counts.ARRIVED, cls: 'bg-emerald-50 text-emerald-600', icon: <Container size={18} className="text-emerald-600" /> },
        { label: 'Entregados', value: counts.DELIVERED, cls: 'bg-green-50/40 text-green-600', icon: <Container size={18} className="text-green-600" /> },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map((c, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${c.cls.replace('text-', 'bg-')}`}>{c.icon}</div>
                    <div>
                        <p className="text-xs text-slate-400">{c.label}</p>
                        <p className="font-bold text-slate-800">{c.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Página principal ─────
const Shipments = () => {
    const [viewingShipment, setViewingShipment] = useState(null);
    const [formModal, setFormModal] = useState({ open: false, shipment: null });
    const [statusShipment, setStatusShipment] = useState(null);
    const [deletingShipment, setDeletingShipment] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [monthlyCloseOpen, setMonthlyCloseOpen] = useState(false);
    const [preAlertaShipment, setPreAlertaShipment] = useState(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const { showSuccess } = useToast();
    const { settings } = useSettings();
    const { user } = useAuth();
    const effectiveRole = useEffectiveRole();
    const isAdmin = effectiveRole === 'ADMIN';
    const {
        items, allItems, loading, search, setSearch,
        typeFilter, setTypeFilter, statusFilter, setStatusFilter,
        vendedorFilter, setVendedorFilter, users,
        refresh
    } = useShipments({ loadUsers: isAdmin });

    const [activeTab, setActiveTab] = useState('D2D');

    useEffect(() => {
        setTypeFilter(activeTab);
        setPage(1);
    }, [activeTab, setTypeFilter]);

    const totalsByType = useMemo(() => ({
        FCL: allItems.filter(i => i.type === 'FCL').length,
        D2D: allItems.filter(i => i.type === 'D2D').length,
        CONSOLIDADO: allItems.filter(i => i.type === 'CONSOLIDADO').length,
    }), [allItems]);

    // Paginación local
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginatedItems = useMemo(
        () => items.slice((page - 1) * pageSize, page * pageSize),
        [items, page, pageSize]
    );

    // Auto-open modal if URL contains ?id=
    useAutoOpenModal(setViewingShipment, shipmentService.getShipment);

    const handleCreated = () => {
        setFormModal({ open: false, shipment: null });
        refresh();
    };

    const handleEdit = (shipment) => {
        setViewingShipment(null);
        setFormModal({ open: true, shipment });
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await shipmentService.updateShipment(id, { status: newStatus });
            setStatusShipment(null);
            refresh();
            return true;
        } catch (error) {
            console.error('Error updating shipment status:', error);
            return false;
        }
    };

    // Filtros en línea
    const filters = (
        <div className="flex items-center gap-3">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 mb-1">Por estado:</span>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
            {isAdmin && (
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 mb-1">Por vendedor:</span>
                    <select
                        value={vendedorFilter}
                        onChange={e => setVendedorFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">Todos los vendedores</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100">
                        <Container size={24} className="text-sky-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Tracking</h1>
                        <p className="text-sm text-slate-500">
                            {items.length} embarque{items.length !== 1 ? 's' : ''} registrado{items.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(effectiveRole === 'ADMIN' || effectiveRole === 'SALES') && (
                        <button
                            onClick={() => setMonthlyCloseOpen(true)}
                            style={{ backgroundColor: settings?.secondaryColor || '#F28729' }}
                            className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-sm"
                        >
                            <BarChart2 size={18} /> Cierre Mensual
                        </button>
                    )}
                    <button
                        onClick={() => setFormModal({ open: true, shipment: null })}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-sky-600/20 transition-all active:scale-95"
                    >
                        <Plus size={18} /> Nuevo Embarque
                    </button>
                </div>
            </div>

            {/* Stats — por estatus (siempre con todos los embarques) */}
            <QuickStats items={allItems} />

            {/* Tabs por tipo */}
            <div className="flex gap-2 border-b border-slate-200 -mt-2">
                <button
                    onClick={() => setActiveTab('D2D')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'D2D' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Package size={16} />
                    Door to Door
                    {totalsByType.D2D > 0 && (
                        <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{totalsByType.D2D}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('FCL')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'FCL' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Container size={16} />
                    FCL
                    {totalsByType.FCL > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{totalsByType.FCL}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('CONSOLIDADO')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'CONSOLIDADO' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Package size={16} />
                    Consolidado
                    {totalsByType.CONSOLIDADO > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{totalsByType.CONSOLIDADO}</span>
                    )}
                </button>
            </div>

            {/* Tabla según tab activa */}
            <EntityTable
                columns={buildShipmentColumns(activeTab)}
                entityName={shipmentConfig.entityName}
                entityNamePlural={shipmentConfig.entityNamePlural}
                items={paginatedItems}
                loading={loading}
                search={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                searchPlaceholder="Buscar embarques por número, cliente...."
                onView={setViewingShipment}
                onEdit={(s) => setFormModal({ open: true, shipment: s })}
                canEdit={(s) => s.status !== 'DELIVERED'}
                canDelete={(s) => (effectiveRole === 'ADMIN') && s.status !== 'DELIVERED'}
                onDelete={(s) => setDeletingShipment(s)}
                showStatusFilter={false}
                showToggle={false}
                extraFilters={filters}
                extraActions={(item) => (
                    <button
                        className={`p-2 rounded-lg transition-colors ${item.status === 'DELIVERED' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}
                        title={item.status === 'DELIVERED' ? 'Entregado — no editable' : 'Cambiar Estado'}
                        disabled={item.status === 'DELIVERED'}
                        onClick={(e) => { e.stopPropagation(); if (item.status !== 'DELIVERED') setStatusShipment(item); }}
                    >
                        <Activity size={18} />
                    </button>
                )}
            />

            {/* Modal de Detalle */}
            {viewingShipment && (
                <ShipmentDetailModal
                    shipment={viewingShipment}
                    onClose={() => setViewingShipment(null)}
                    onEdit={() => handleEdit(viewingShipment)}
                    onGeneratePreAlerta={() => setPreAlertaShipment(viewingShipment)}
                />
            )}

            {/* Modal de Pre-Alerta */}
            {preAlertaShipment && (
                <PreAlertaModal
                    isOpen={!!preAlertaShipment}
                    onClose={() => setPreAlertaShipment(null)}
                    shipment={preAlertaShipment}
                    currentUser={user}
                />
            )}

            {/* Modal de Formulario (Crear / Editar) */}
            {formModal.open && (
                <ShipmentFormModal
                    isOpen={formModal.open}
                    shipment={formModal.shipment}
                    onClose={() => setFormModal({ open: false, shipment: null })}
                    onSuccess={handleCreated}
                />
            )}

            <ChangeShipmentStatusModal
                isOpen={!!statusShipment}
                onClose={() => setStatusShipment(null)}
                shipment={statusShipment}
                onUpdateStatus={handleUpdateStatus}
            />

            <TrackingMonthlyCloseModal
                isOpen={monthlyCloseOpen}
                onClose={() => setMonthlyCloseOpen(false)}
            />

            <ConfirmDeleteModal
                isOpen={!!deletingShipment}
                onClose={() => setDeletingShipment(null)}
                onConfirm={async () => {
                    if (!deletingShipment) return;
                    setDeleteLoading(true);
                    try {
                        await shipmentService.deleteShipment(deletingShipment.id);
                        setDeletingShipment(null);
                        refresh();
                        showSuccess('Eliminado', 'Embarque eliminado correctamente');
                    } catch (e) {
                        console.error('Error deleting shipment', e);
                    } finally {
                        setDeleteLoading(false);
                    }
                }}
                title="Eliminar Embarque"
                message="¿Estás seguro de que deseas eliminar este embarque?"
                itemName={deletingShipment ? `EMB-${String(deletingShipment.number || 0).padStart(5, '0')}` : ''}
                loading={deleteLoading}
            />
        </div>
    );
};

export default Shipments;
