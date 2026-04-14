import { useState } from 'react';
import { Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import serviceService from '../../services/service.service';
import { serviceConfig } from '../../config/serviceConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ServiceDetailModal from '../../components/services/ServiceDetailModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: serviceService.getServices,
    create: serviceService.createService,
    update: serviceService.updateService,
    delete: serviceService.deleteService,
    toggleStatus: serviceService.toggleStatus
};

const Services = () => {
    const { user } = useAuth();
    const [detailItem, setDetailItem] = useState(null);
    
    // Hook genérico con toda la lógica CRUD
    const {
        items,
        loading,
        page,
        totalPages,
        totalItems,
        search,
        setSearch,
        filterStatus,
        setFilterStatus,
        setPage,
        selectedItem,
        isFormOpen,
        isDeleteOpen,
        isToggleOpen,
        isEditMode,
        openCreateForm,
        openEditForm,
        openDeleteConfirm,
        openToggleConfirm,
        closeAllModals,
        handleDelete,
        handleToggleStatus,
        handleFormSuccess,
        actionLoading
    } = useEntityCRUD({
        service: adaptedService,
        entityName: serviceConfig.entityName,
        limit: 10,
        hasStatusField: true // Ahora Services tienen campo isActive
    });

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
                onSuccess={handleFormSuccess}
                editMode={isEditMode}
                entityData={selectedItem}
                service={adaptedService}
                entityName={serviceConfig.entityName}
                sections={serviceConfig.formSections}
            />
            
            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={closeAllModals}
                onConfirm={handleDelete}
                title={`Eliminar ${serviceConfig.entityName}`}
                message={`¿Estás seguro de que deseas eliminar este ${serviceConfig.entityName}?`}
                itemName={selectedItem?.name}
                loading={actionLoading}
            />

            <ConfirmToggleModal
                isOpen={isToggleOpen}
                onClose={closeAllModals}
                onConfirm={handleToggleStatus}
                entityName={serviceConfig.entityName}
                name={selectedItem?.name}
                isActive={selectedItem?.isActive}
                loading={actionLoading}
            />

            <ServiceDetailModal
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                service={detailItem}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra los servicios que ofrece la empresa</p>
                </div>
                
                {user?.role === 'ADMIN' && (
                    <button 
                        onClick={openCreateForm}
                        className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Package size={20} />
                        Nuevo Servicio
                    </button>
                )}
            </div>

            {/* Tabla genérica */}
            <EntityTable
                items={items}
                columns={serviceConfig.columns}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                onView={handleViewDetail}
                onEdit={openEditForm}
                onDelete={openDeleteConfirm}
                onToggleStatus={openToggleConfirm}
                entityName={serviceConfig.entityName}
                entityNamePlural={serviceConfig.entityNamePlural}
                canEdit={user?.role === 'ADMIN'}
                canDelete={user?.role === 'ADMIN'}
                showToggle={user?.role === 'ADMIN'}
                showStatusFilter={true}
                codeColor={serviceConfig.codeColor}
            />
        </div>
    );
};

export default Services;
