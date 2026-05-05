import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Plus, Ship, Package } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import EntityTable from '../../components/shared/EntityTable';
import { shipmentConfig, buildShipmentColumns } from '../../config/shipmentConfig';
import ShipmentDetailModal from '../../components/tracking/ShipmentDetailModal';
import ShipmentFormModal from '../../components/tracking/ShipmentFormModal';
import shipmentService from '../../services/shipment.service';
import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';

// ── Status labels para el filtro ─────
const STATUS_OPTIONS = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'AT_ORIGIN_WAREHOUSE', label: 'En Almacén Origen' },
    { value: 'ON_VESSEL', label: 'En Tránsito' },
    { value: 'AT_DESTINATION_PORT', label: 'En Puerto Destino' },
    { value: 'CUSTOMS_CLEARANCE', label: 'En Aduana' },
    { value: 'DELIVERED', label: 'Entregado' },
];

// Tabs de tipos (FCL, D2D, CONSOLIDADO)

// ── Hook de datos ─────
const useShipments = () => {
    const [items, setItems] = useState([]);
    const [allItems, setAllItems] = useState([]); // Para stats (sin filtros)
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
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

    const fetchShipments = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (debouncedSearch) params.search = debouncedSearch;
            if (typeFilter) params.type = typeFilter;
            if (statusFilter) params.status = statusFilter;
            const data = await shipmentService.getShipments(params);
            setItems(data);
        } catch {
            showError('Error', 'No se pudieron cargar los embarques');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, typeFilter, statusFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { fetchShipments(); }, [fetchShipments]);

    const refresh = useCallback(() => {
        fetchAll();
        fetchShipments();
    }, [fetchAll, fetchShipments]);

    return {
        items, allItems, loading, search, setSearch,
        typeFilter, setTypeFilter, statusFilter, setStatusFilter,
        refresh
    };
};

// ── Estadísticas rápidas ─────
const QuickStats = ({ items }) => {
    const counts = useMemo(() => ({
        PENDING: items.filter(i => i.status === 'PENDING').length,
        AT_ORIGIN_WAREHOUSE: items.filter(i => i.status === 'AT_ORIGIN_WAREHOUSE').length,
        ON_VESSEL: items.filter(i => i.status === 'ON_VESSEL').length,
        AT_DESTINATION_PORT: items.filter(i => i.status === 'AT_DESTINATION_PORT').length,
        CUSTOMS_CLEARANCE: items.filter(i => i.status === 'CUSTOMS_CLEARANCE').length,
        DELIVERED: items.filter(i => i.status === 'DELIVERED').length,
    }), [items]);

    const cards = [
        { label: 'Pendiente', value: counts.PENDING, cls: 'bg-amber-50 text-amber-600', icon: <Package size={18} className="text-amber-600" /> },
        { label: 'En Almacén Origen', value: counts.AT_ORIGIN_WAREHOUSE, cls: 'bg-orange-50 text-orange-600', icon: <Package size={18} className="text-orange-600" /> },
        { label: 'En Tránsito', value: counts.ON_VESSEL, cls: 'bg-blue-50/60 text-blue-600', icon: <Ship size={18} className="text-blue-600" /> },
        { label: 'En Puerto Destino', value: counts.AT_DESTINATION_PORT, cls: 'bg-purple-50 text-purple-600', icon: <Container size={18} className="text-purple-600" /> },
        { label: 'En Aduana', value: counts.CUSTOMS_CLEARANCE, cls: 'bg-pink-50 text-pink-600', icon: <Package size={18} className="text-pink-600" /> },
        { label: 'Entregados', value: counts.DELIVERED, cls: 'bg-green-50/60 text-green-600', icon: <Container size={18} className="text-green-600" /> },
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
    const { user } = useAuth();
    const {
        items, allItems, loading, search, setSearch,
        typeFilter, setTypeFilter, statusFilter, setStatusFilter,
        refresh
    } = useShipments();

    const [activeTab, setActiveTab] = useState('FCL');

    useEffect(() => {
        setTypeFilter(activeTab);
    }, [activeTab, setTypeFilter]);

    const totalsByType = useMemo(() => ({
        FCL: allItems.filter(i => i.type === 'FCL').length,
        D2D: allItems.filter(i => i.type === 'D2D').length,
        CONSOLIDADO: allItems.filter(i => i.type === 'CONSOLIDADO').length,
    }), [allItems]);

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

    // Filtros en línea
    const filters = (
        <div className="flex items-center gap-3">
            <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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
                <button
                    onClick={() => setFormModal({ open: true, shipment: null })}
                    className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-sky-600/20 transition-all active:scale-95"
                >
                    <Plus size={18} /> Nuevo Embarque
                </button>
            </div>

            {/* Stats — por estatus (siempre con todos los embarques) */}
            <QuickStats items={allItems} />

            {/* Tabs por tipo */}
            <div className="flex gap-2 border-b border-slate-200 -mt-2">
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
                items={items}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                onView={setViewingShipment}
                onEdit={(s) => setFormModal({ open: true, shipment: s })}
                showStatusFilter={false}
                showToggle={false}
                extraFilters={filters}
            />

            {/* Modal de Detalle */}
            {viewingShipment && (
                <ShipmentDetailModal
                    shipment={viewingShipment}
                    onClose={() => setViewingShipment(null)}
                    onEdit={() => handleEdit(viewingShipment)}
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
        </div>
    );
};

export default Shipments;
