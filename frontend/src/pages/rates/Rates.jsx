import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Ship, Globe, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import rateService from '../../services/rate.service';
import allyService from '../../services/ally.service';
import portService from '../../services/port.service';
import shippingLineService from '../../services/shippingLine.service';
import { rateConfig } from '../../config/rateConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import RateDetailModal from '../../components/rates/RateDetailModal';
import RatePDFModal from '../../components/rates/RatePDFModal';
import QuickCreatePortModal from '../../components/shared/QuickCreatePortModal';
import QuickCreateShippingLineModal from '../../components/shared/QuickCreateShippingLineModal';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: (params) => rateService.getRates({ ...params, region: 'CHINA' }),
    create: rateService.createRate,
    update: rateService.updateRate,
    delete: rateService.deleteRate
};

const Rates = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('CHINA');
    const [detailItem, setDetailItem] = useState(null);
    const [statusFilter, setStatusFilter] = useState('valid');
    
    // Modals
    const [showQuickPort, setShowQuickPort] = useState(false);
    const [showQuickShippingLine, setShowQuickShippingLine] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    
    // Catálogos
    const [allies, setAllies] = useState([]);
    const [ports, setPorts] = useState([]);
    const [shippingLines, setShippingLines] = useState([]);
    const [catalogsLoading, setCatalogsLoading] = useState(true);
    
    // Hook genérico con toda la lógica CRUD
    const {
        items,
        loading,
        page,
        totalPages,
        totalItems,
        search,
        setSearch,
        setPage,
        selectedItem,
        isFormOpen,
        isDeleteOpen,
        isEditMode,
        openCreateForm,
        openEditForm,
        openDeleteConfirm,
        closeAllModals,
        handleDelete,
        handleFormSuccess,
        actionLoading,
        customFilters,
        setCustomFilters
    } = useEntityCRUD({
        service: adaptedService,
        entityName: rateConfig.entityName,
        limit: 20,
        hasStatusField: false,
        customFilters: { status: statusFilter }
    });
    
    // Cargar catálogos
    useEffect(() => {
        loadCatalogs();
    }, []);
    
    const loadCatalogs = async () => {
        setCatalogsLoading(true);
        try {
            const [alliesData, portsData, linesData] = await Promise.all([
                allyService.getAllies({ all: 'true' }),
                portService.getPorts({ all: 'true' }),
                shippingLineService.getShippingLines({ all: 'true' })
            ]);
            setAllies(alliesData.data || []);
            setPorts(portsData.data || []);
            setShippingLines(linesData.data || []);
        } catch (error) {
            console.error('Error loading catalogs:', error);
        } finally {
            setCatalogsLoading(false);
        }
    };
    
    // Opciones para selects
    const allyOptions = useMemo(() => 
        allies.filter(a => a.isActive !== false).map(a => ({
            value: a.id,
            label: `${a.name} (${a.internalCode})`
        })),
        [allies]
    );
    
    const portOptions = useMemo(() => 
        ports.filter(p => p.isActive !== false).map(p => ({
            value: p.id,
            label: `${p.name} (${p.code})`
        })),
        [ports]
    );
    
    const shippingLineOptions = useMemo(() => 
        shippingLines.filter(l => l.isActive !== false).map(l => ({
            value: l.id,
            label: l.name
        })),
        [shippingLines]
    );
    
    // Inyectar opciones dinámicamente en las secciones
    const sectionsWithOptions = useMemo(() => {
        return rateConfig.formSections.map(section => ({
            ...section,
            fields: section.fields.map(field => {
                if (field.name === 'allyId') return { ...field, type: 'select', options: allyOptions };
                if (field.name === 'originPortId') return { ...field, type: 'select', options: portOptions };
                if (field.name === 'destinationPortId') return { ...field, type: 'select', options: portOptions };
                if (field.name === 'shippingLineId') return { ...field, type: 'select', options: shippingLineOptions };
                return field;
            })
        }));
    }, [allyOptions, portOptions, shippingLineOptions]);
    
    // Handler para ver detalle
    const handleViewDetail = (item) => {
        setDetailItem(item);
    };

    return (
        <div className="space-y-6">
            {/* Modales */}
            <EntityFormModal 
                isOpen={isFormOpen} 
                onClose={closeAllModals} 
                onSuccess={() => {
                    handleFormSuccess();
                    loadCatalogs();
                }}
                editMode={isEditMode}
                entityData={selectedItem}
                service={adaptedService}
                entityName={rateConfig.entityName}
                sections={sectionsWithOptions}
                customData={{ region: activeTab }}
            />
            
            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={closeAllModals}
                onConfirm={handleDelete}
                title={`Eliminar ${rateConfig.entityName}`}
                message={`¿Estás seguro de que deseas eliminar esta ${rateConfig.entityName}?`}
                itemName={selectedItem ? `${selectedItem.originPort?.code} → ${selectedItem.destinationPort?.code}` : ''}
                loading={actionLoading}
            />
            
            <RateDetailModal
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                rate={detailItem}
            />
            
            <RatePDFModal
                isOpen={showPDFModal}
                onClose={() => setShowPDFModal(false)}
                rates={items}
                region={activeTab}
            />
            
            <QuickCreatePortModal
                isOpen={showQuickPort}
                onClose={() => setShowQuickPort(false)}
                onSuccess={() => {
                    setShowQuickPort(false);
                    loadCatalogs();
                }}
            />
            
            <QuickCreateShippingLineModal
                isOpen={showQuickShippingLine}
                onClose={() => setShowQuickShippingLine(false)}
                onSuccess={() => {
                    setShowQuickShippingLine(false);
                    loadCatalogs();
                }}
            />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tarifario</h2>
                    <p className="text-slate-500 text-sm mt-1">Gestión de tarifas por región</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPDFModal(true)}
                        disabled={items.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={18} />
                        Generar PDF
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={openCreateForm}
                            className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <DollarSign size={20} />
                            Nueva Tarifa {activeTab === 'CHINA' ? 'China' : 'Otros Países'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => {
                        setActiveTab('CHINA');
                        setPage(1);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'CHINA'
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Ship size={16} />
                    China
                    {activeTab === 'CHINA' && totalItems > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                            {totalItems}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => {
                        setActiveTab('OTHER');
                        setPage(1);
                    }}
                    disabled
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px opacity-50 cursor-not-allowed ${
                        activeTab === 'OTHER'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-500'
                    }`}
                    title="Próximamente"
                >
                    <Globe size={16} />
                    Otros Países
                    <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                        Próximamente
                    </span>
                </button>
            </div>

            {/* Filtros de estado de validez */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCustomFilters({ status: 'valid' })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                customFilters?.status === 'valid'
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Vigentes
                        </button>
                        <button
                            onClick={() => setCustomFilters({ status: 'expired' })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                customFilters?.status === 'expired'
                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Expiradas
                        </button>
                        <button
                            onClick={() => setCustomFilters({ status: 'all' })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                customFilters?.status === 'all'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todas
                        </button>
                    </div>
                </div>
            </div>

            <EntityTable
                items={items}
                columns={rateConfig.columns}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                onView={handleViewDetail}
                onEdit={openEditForm}
                onDelete={openDeleteConfirm}
                entityName={rateConfig.entityName}
                entityNamePlural={rateConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                showToggle={false}
                showStatusFilter={false}
                codeColor={rateConfig.codeColor}
            />
        </div>
    );
};

export default Rates;
