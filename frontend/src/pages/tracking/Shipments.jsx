import { useState, useEffect, useCallback } from 'react';
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

const TYPE_OPTIONS = [
    { value: '', label: 'Todos los tipos' },
    { value: 'FCL', label: 'FCL (Contenedor)' },
    { value: 'D2D', label: 'Door to Door' },
    { value: 'CONSOLIDADO', label: 'Consolidado' },
];

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
    const totalFCL = items.filter(i => i.type === 'FCL').length;
    const totalD2D = items.filter(i => i.type === 'D2D').length;
    const inTransit = items.filter(i => i.status === 'ON_VESSEL').length;
    const delivered = items.filter(i => i.status === 'DELIVERED').length;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg"><Container size={18} className="text-indigo-500" /></div>
                <div><p className="text-xs text-slate-400">FCL</p><p className="font-bold text-slate-800">{totalFCL}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg"><Package size={18} className="text-teal-500" /></div>
                <div><p className="text-xs text-slate-400">Door to Door</p><p className="font-bold text-slate-800">{totalD2D}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Ship size={18} className="text-blue-500" /></div>
                <div><p className="text-xs text-slate-400">En tránsito</p><p className="font-bold text-slate-800">{inTransit}</p></div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><Container size={18} className="text-green-500" /></div>
                <div><p className="text-xs text-slate-400">Entregados</p><p className="font-bold text-slate-800">{delivered}</p></div>
            </div>
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
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
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

            {/* Stats — siempre con todos los embarques, sin filtros */}
            <QuickStats items={allItems} />

            {/* Tabla */}
            <EntityTable
                columns={buildShipmentColumns(typeFilter)}
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
