import { useState } from 'react';
import { Ship, Plane } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import shippingLineService from '../../services/shippingLine.service';
import { shippingLineConfig } from '../../config/shippingLineConfig.jsx';
import airlineService from '../../services/airline.service';
import { airLineConfig } from '../../config/airLineConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal';
import LineDetailModal from '../../components/lines/LineDetailModal';


const adaptedShippingLineService = {
    getAll: (params) => shippingLineService.getShippingLines(params),
    create: (data) => shippingLineService.createShippingLine(data),
    update: (id, data) => shippingLineService.updateShippingLine(id, data),
    delete: (id) => shippingLineService.deleteShippingLine(id),
    toggleStatus: (id) => shippingLineService.toggleStatus(id)
};

const adaptedAirLineService = {
    getAll: (params) => airlineService.getAirLines(params),
    create: (data) => airlineService.createAirLine(data),
    update: (id, data) => airlineService.updateAirLine(id, data),
    delete: (id) => airlineService.deleteAirLine(id),
    toggleStatus: (id) => airlineService.toggleStatus(id)
};

const Lines = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('shipping');

    const {
        items: shippingItems,
        loading: shippingLoading,
        page: shippingPage,
        totalPages: shippingTotalPages,
        totalItems: shippingTotalItems,
        search: shippingSearch,
        setSearch: setShippingSearch,
        filterStatus: shippingFilterStatus,
        setFilterStatus: setShippingFilterStatus,
        setPage: setShippingPage,
        selectedItem: selectedShipping,
        isFormOpen: isShippingFormOpen,
        isDeleteOpen: isShippingDeleteOpen,
        isToggleOpen: isShippingToggleOpen,
        isEditMode: isShippingEditMode,
        openCreateForm: openCreateShippingForm,
        openEditForm: openEditShippingForm,
        openDeleteConfirm: openDeleteShippingConfirm,
        openToggleConfirm: openToggleShippingConfirm,
        closeAllModals: closeAllShippingModals,
        handleDelete: handleDeleteShipping,
        handleToggleStatus: handleToggleShippingStatus,
        handleFormSuccess: handleShippingFormSuccess,
        actionLoading: shippingActionLoading
    } = useEntityCRUD({
        service: adaptedShippingLineService,
        entityName: shippingLineConfig.entityName,
        limit: 10,
        hasStatusField: true
    });

    const {
        items: airItems,
        loading: airLoading,
        page: airPage,
        totalPages: airTotalPages,
        totalItems: airTotalItems,
        search: airSearch,
        setSearch: setAirSearch,
        filterStatus: airFilterStatus,
        setFilterStatus: setAirFilterStatus,
        setPage: setAirPage,
        selectedItem: selectedAir,
        isFormOpen: isAirFormOpen,
        isDeleteOpen: isAirDeleteOpen,
        isToggleOpen: isAirToggleOpen,
        isEditMode: isAirEditMode,
        openCreateForm: openCreateAirForm,
        openEditForm: openEditAirForm,
        openDeleteConfirm: openDeleteAirConfirm,
        openToggleConfirm: openToggleAirConfirm,
        closeAllModals: closeAllAirModals,
        handleDelete: handleDeleteAir,
        handleToggleStatus: handleToggleAirStatus,
        handleFormSuccess: handleAirFormSuccess,
        actionLoading: airActionLoading
    } = useEntityCRUD({
        service: adaptedAirLineService,
        entityName: airLineConfig.entityName,
        limit: 10,
        hasStatusField: true
    });

    const [detailItem, setDetailItem] = useState(null);
    const [detailType, setDetailType] = useState(null);
    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Líneas de Transporte</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión de navieras y aerolíneas</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={activeTab === 'shipping' ? openCreateShippingForm : openCreateAirForm}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        {activeTab === 'shipping' ? <Ship size={16} /> : <Plane size={16} />}
                        {activeTab === 'shipping' ? 'Crear Nueva Línea Naviera' : 'Crear Nueva Línea Aérea'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('shipping')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'shipping'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Ship size={16} />
                    Navieras
                    {shippingTotalItems > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            {shippingTotalItems}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('air')}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        activeTab === 'air'
                            ? 'border-sky-500 text-sky-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Plane size={16} />
                    Líneas Aéreas
                    {airTotalItems > 0 && (
                        <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
                            {airTotalItems}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab: Navieras */}
            {activeTab === 'shipping' && (
                <>
                    <EntityTable
                        columns={shippingLineConfig.columns}
                        entityName={shippingLineConfig.entityName}
                        entityNamePlural={shippingLineConfig.entityNamePlural}
                        codeColor={shippingLineConfig.codeColor}
                        items={shippingItems}
                        loading={shippingLoading}
                        page={shippingPage}
                        totalPages={shippingTotalPages}
                        totalItems={shippingTotalItems}
                        search={shippingSearch}
                        onSearchChange={setShippingSearch}
                        filterStatus={shippingFilterStatus}
                        onFilterStatusChange={setShippingFilterStatus}
                        onPageChange={setShippingPage}
                        onView={(item) => { setDetailItem(item); setDetailType('shipping'); }}
                        onEdit={isAdmin ? openEditShippingForm : null}
                        onDelete={isAdmin ? openDeleteShippingConfirm : null}
                        onToggleStatus={isAdmin ? openToggleShippingConfirm : null}
                        canEdit={isAdmin}
                        canDelete={isAdmin}
                        showToggle={isAdmin}
                    />

                    <EntityFormModal
                        isOpen={isShippingFormOpen}
                        onClose={closeAllShippingModals}
                        sections={shippingLineConfig.formSections}
                        entityData={isShippingEditMode ? selectedShipping : null}
                        editMode={isShippingEditMode}
                        entityName={shippingLineConfig.entityName}
                        onSuccess={handleShippingFormSuccess}
                        service={adaptedShippingLineService}
                    />

                    <ConfirmDeleteModal
                        isOpen={isShippingDeleteOpen}
                        onClose={closeAllShippingModals}
                        onConfirm={handleDeleteShipping}
                        title={`Eliminar naviera`}
                        message={`¿Estás seguro de que deseas eliminar la naviera "${selectedShipping?.name}"? Esta acción no se puede deshacer.`}
                        loading={shippingActionLoading}
                    />

                    <ConfirmToggleModal
                        isOpen={isShippingToggleOpen}
                        onClose={closeAllShippingModals}
                        onConfirm={handleToggleShippingStatus}
                        entityName={shippingLineConfig.entityName}
                        name={selectedShipping?.name}
                        isActive={selectedShipping?.isActive}
                        loading={shippingActionLoading}
                    />
                </>
            )}

            {/* Tab: Líneas Aéreas */}
            {activeTab === 'air' && (
                <>
                    <EntityTable
                        columns={airLineConfig.columns}
                        entityName={airLineConfig.entityName}
                        entityNamePlural={airLineConfig.entityNamePlural}
                        codeColor={airLineConfig.codeColor}
                        items={airItems}
                        loading={airLoading}
                        page={airPage}
                        totalPages={airTotalPages}
                        totalItems={airTotalItems}
                        search={airSearch}
                        onSearchChange={setAirSearch}
                        filterStatus={airFilterStatus}
                        onFilterStatusChange={setAirFilterStatus}
                        onPageChange={setAirPage}
                        onView={(item) => { setDetailItem(item); setDetailType('air'); }}
                        onEdit={isAdmin ? openEditAirForm : null}
                        onDelete={isAdmin ? openDeleteAirConfirm : null}
                        onToggleStatus={isAdmin ? openToggleAirConfirm : null}
                        canEdit={isAdmin}
                        canDelete={isAdmin}
                        showToggle={isAdmin}
                    />

                    <EntityFormModal
                        isOpen={isAirFormOpen}
                        onClose={closeAllAirModals}
                        sections={airLineConfig.formSections}
                        entityData={isAirEditMode ? selectedAir : null}
                        editMode={isAirEditMode}
                        entityName={airLineConfig.entityName}
                        onSuccess={handleAirFormSuccess}
                        service={adaptedAirLineService}
                    />

                    <ConfirmDeleteModal
                        isOpen={isAirDeleteOpen}
                        onClose={closeAllAirModals}
                        onConfirm={handleDeleteAir}
                        title={`Eliminar línea aérea`}
                        message={`¿Estás seguro de que deseas eliminar la aerolínea "${selectedAir?.name}"? Esta acción no se puede deshacer.`}
                        loading={airActionLoading}
                    />

                    <ConfirmToggleModal
                        isOpen={isAirToggleOpen}
                        onClose={closeAllAirModals}
                        onConfirm={handleToggleAirStatus}
                        entityName={airLineConfig.entityName}
                        name={selectedAir?.name}
                        isActive={selectedAir?.isActive}
                        loading={airActionLoading}
                    />
                </>
            )}
            <LineDetailModal
                isOpen={!!detailItem}
                onClose={() => { setDetailItem(null); setDetailType(null); }}
                item={detailItem}
                type={detailType}
            />
        </div>
    );
};

export default Lines;
