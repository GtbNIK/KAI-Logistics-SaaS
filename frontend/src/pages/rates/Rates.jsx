import { useState } from 'react';
import { DollarSign, Ship, Globe, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import rateService from '../../services/rate.service';
import { rateConfig } from '../../config/rateConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
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
    const [activeTab, setActiveTab] = useState('CHINA');
    const [detailItem, setDetailItem] = useState(null);
    
    // Modals
    const [showPDFModal, setShowPDFModal] = useState(false);
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
                entityName={rateConfig.entityName}
                entityNamePlural={rateConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                showToggle={false}
                showStatusFilter={false}
                codeColor={rateConfig.codeColor}
                extraFilters={
                    <select
                        value={customFilters?.status || 'valid'}
                        onChange={(e) => setCustomFilters({ status: e.target.value })}
                        className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                    >
                        <option value="valid">Vigentes</option>
                        <option value="expired">Expiradas</option>
                        <option value="all">Todas</option>
                    </select>
                }
            />
        </div>
    );
};

export default Rates;
