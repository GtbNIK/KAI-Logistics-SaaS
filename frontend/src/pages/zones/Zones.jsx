import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import zoneService from '../../services/zone.service';
import { zoneConfig } from '../../config/zoneConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ZoneDetailModal from '../../components/zones/ZoneDetailModal';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: zoneService.getZones,
    create: zoneService.createZone,
    update: zoneService.updateZone,
    delete: zoneService.deleteZone,
    toggleStatus: zoneService.toggleStatus
};

const Zones = () => {
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
        entityName: zoneConfig.entityName,
        limit: 10,
        hasStatusField: true // Ahora Zones tienen campo isActive
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
                entityName={zoneConfig.entityName}
                sections={zoneConfig.formSections}
            />
            
            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={closeAllModals}
                onConfirm={handleDelete}
                title={`Desactivar ${zoneConfig.entityName}`}
                message={`¿Estás seguro de que deseas desactivar esta ${zoneConfig.entityName}? Podrás reactivarla después.`}
                itemName={selectedItem?.name}
                loading={actionLoading}
            />

            <ConfirmDeleteModal
                isOpen={isToggleOpen}
                onClose={closeAllModals}
                onConfirm={handleToggleStatus}
                title={selectedItem?.isActive ? 'Desactivar Zona' : 'Activar Zona'}
                message={selectedItem?.isActive 
                    ? '¿Deseas desactivar esta zona? No aparecerá en nuevas cotizaciones.'
                    : '¿Deseas reactivar esta zona?'
                }
                itemName={selectedItem?.name}
                loading={actionLoading}
            />

            <ZoneDetailModal
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                zone={detailItem}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Zonas de Entrega</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra las zonas geográficas de cobertura</p>
                </div>
                
                {user?.role === 'ADMIN' && (
                    <button 
                        onClick={openCreateForm}
                        className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <MapPin size={20} />
                        Nueva Zona
                    </button>
                )}
            </div>

            {/* Tabla genérica */}
            <EntityTable
                items={items}
                columns={zoneConfig.columns}
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
                entityName={zoneConfig.entityName}
                entityNamePlural={zoneConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                showToggle={user?.role === 'ADMIN'}
                showStatusFilter={true}
                codeColor={zoneConfig.codeColor}
            />
        </div>
    );
};

export default Zones;
