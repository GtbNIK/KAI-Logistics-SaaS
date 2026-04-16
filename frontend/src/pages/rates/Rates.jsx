import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Ship, Globe, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import rateService from '../../services/rate.service';
import allyService from '../../services/ally.service';
import { rateConfig } from '../../config/rateConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal';
import RateDetailModal from '../../components/rates/RateDetailModal';
import RatePDFModal from '../../components/rates/RatePDFModal';
import CreateRateModal from '../../components/rates/CreateRateModal';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: (params) => rateService.getRates({ ...params, region: 'CHINA' }),
    create: rateService.createRate,
    update: rateService.updateRate,
    delete: rateService.deleteRate
};

const Rates = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [activeTab, setActiveTab] = useState('CHINA');
    const [detailItem, setDetailItem] = useState(null);
    const [allies, setAllies] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [toggleModal, setToggleModal] = useState({ open: false, target: null, type: null }); // type: 'single' | 'bulk-activate' | 'bulk-deactivate'
    const [toggling, setToggling] = useState(false);
    
    // Modals
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [showPdfNoteModal, setShowPdfNoteModal] = useState(false);
    const [pdfNote, setPdfNote] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    
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
        isDeleteOpen,
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
        customFilters: { status: 'valid' }
    });

    // Cargar aliados para el filtro
    useEffect(() => {
        const loadAllies = async () => {
            try {
                const data = await allyService.getAllies({ all: 'true', isActive: 'true' });
                setAllies(data.data || []);
            } catch (error) {
                console.error('Error loading allies:', error);
            }
        };
        loadAllies();
    }, []);

    const selectedAllyId = customFilters?.allyId || '';
    const selectedAlly = useMemo(
        () => allies.find(a => a.id === selectedAllyId),
        [allies, selectedAllyId]
    );

    // Handlers para acciones masivas
    const openBulkActivateModal = () => {
        if (!selectedAllyId) return;
        setToggleModal({ open: true, type: 'bulk-activate', target: { allyId: selectedAllyId, name: selectedAlly?.name } });
    };

    const openBulkDeactivateModal = () => {
        if (!selectedAllyId) return;
        setToggleModal({ open: true, type: 'bulk-deactivate', target: { allyId: selectedAllyId, name: selectedAlly?.name } });
    };

    const handleConfirmToggle = async () => {
        if (!toggleModal.open) return;
        setToggling(true);
        try {
            if (toggleModal.type === 'single') {
                await rateService.toggleActive(toggleModal.target.id);
                showSuccess(
                    toggleModal.target.isActive ? 'Tarifa desactivada' : 'Tarifa activada',
                    toggleModal.target.isActive ? 'La tarifa ya no se usará en cotizaciones' : 'La tarifa ahora está disponible para cotizaciones'
                );
            } else if (toggleModal.type === 'bulk-activate') {
                const result = await rateService.bulkActivate(toggleModal.target.allyId);
                showSuccess('Tarifas activadas', result.message);
            } else if (toggleModal.type === 'bulk-deactivate') {
                const result = await rateService.bulkDeactivate(toggleModal.target.allyId);
                showSuccess('Tarifas desactivadas', result.message);
            }
            handleFormSuccess();
            setToggleModal({ open: false, target: null, type: null });
        } catch (error) {
            console.error('Error toggling:', error);
            showError('Error', error.response?.data?.message || 'Error al ejecutar la acción');
        } finally {
            setToggling(false);
        }
    };

    const onToggleStatus = (item, e) => {
        e.stopPropagation();
        setToggleModal({ open: true, type: 'single', target: item });
    };

    return (
        <div className="space-y-6">
            {/* Modales */}
            <CreateRateModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setEditItem(null); }}
                onSuccess={() => {
                    handleFormSuccess();
                    setShowCreateModal(false);
                    setEditItem(null);
                }}
                editMode={!!editItem}
                entityData={editItem}
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
                observations={pdfNote}
            />

            <ConfirmToggleModal
                isOpen={toggleModal.open}
                onClose={() => setToggleModal({ open: false, target: null, type: null })}
                onConfirm={handleConfirmToggle}
                entityName={toggleModal.type?.startsWith('bulk') ? 'tarifas' : 'tarifa'}
                name={toggleModal.type === 'single' ? `${toggleModal.target?.originPort?.code || ''} → ${toggleModal.target?.destinationPort?.code || ''}` : selectedAlly?.name}
                isActive={toggleModal.type === 'single' ? !!toggleModal.target?.isActive : toggleModal.type === 'bulk-deactivate'}
                loading={toggling}
                showNote={false}
            />

            {/* Modal de Observación General para PDF */}
            {showPdfNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Observaciones del PDF</h3>
                                <p className="text-sm text-slate-500">Opcional. Se mostrará en una segunda página.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            <textarea
                                value={pdfNote}
                                onChange={(e) => setPdfNote(e.target.value)}
                                rows={6}
                                placeholder="Escribe aquí observaciones generales para el PDF (opcional)"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 resize-y"
                            />
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setShowPdfNoteModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={() => { setShowPdfNoteModal(false); setShowPDFModal(true); }} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Continuar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tarifario</h2>
                    <p className="text-slate-500 text-sm mt-1">Gestión de tarifas por región</p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Acciones masivas - solo visibles cuando hay aliado filtrado (ADMIN) */}
                    {user?.role === 'ADMIN' && selectedAllyId && (
                        <>
                            <button
                                onClick={openBulkActivateModal}
                                disabled={bulkLoading}
                                title={`Activar todas las tarifas vigentes de ${selectedAlly?.name}`}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2.5 rounded-xl font-medium shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <CheckCircle2 size={18} />
                                Activar todas
                            </button>
                            <button
                                onClick={openBulkDeactivateModal}
                                disabled={bulkLoading}
                                title={`Desactivar todas las tarifas de ${selectedAlly?.name}`}
                                className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-2.5 rounded-xl font-medium shadow-lg shadow-slate-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <XCircle size={18} />
                                Desactivar todas
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowPdfNoteModal(true)}
                        disabled={items.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={18} />
                        Generar PDF
                    </button>
                    {user?.role === 'ADMIN' && (
                        <button
                            onClick={() => { setEditItem(null); setShowCreateModal(true); }}
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
                onView={(item) => setDetailItem(item)}
                onEdit={(item) => { setEditItem(item); setShowCreateModal(true); }}
                onDelete={openDeleteConfirm}
                onToggleStatus={onToggleStatus}
                entityName={rateConfig.entityName}
                entityNamePlural={rateConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                showToggle={true}
                showStatusFilter={false}
                codeColor={rateConfig.codeColor}
                extraFilters={
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={customFilters?.allyId || ''}
                            onChange={(e) => setCustomFilters({ ...customFilters, allyId: e.target.value || undefined })}
                            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                        >
                            <option value="">Todos los aliados</option>
                            {allies.map(ally => (
                                <option key={ally.id} value={ally.id}>
                                    {ally.name} ({ally.internalCode})
                                </option>
                            ))}
                        </select>
                        <select
                            value={customFilters?.isActive || ''}
                            onChange={(e) => setCustomFilters({ ...customFilters, isActive: e.target.value || undefined })}
                            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                        >
                            <option value="">Activas e inactivas</option>
                            <option value="true">Solo activas</option>
                            <option value="false">Solo inactivas</option>
                        </select>
                        <select
                            value={customFilters?.status || 'valid'}
                            onChange={(e) => setCustomFilters({ ...customFilters, status: e.target.value })}
                            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                        >
                            <option value="valid">Vigentes</option>
                            <option value="expired">Expiradas</option>
                            <option value="all">Todas</option>
                        </select>
                    </div>
                }
            />
        </div>
    );
};

export default Rates;
