import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAutoOpenModal } from '../../hooks/useAutoOpenModal';
import allyService from '../../services/ally.service';
import { allyConfig } from '../../config/allyConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import AllyDetailModal from '../../components/allies/AllyDetailModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: allyService.getAllies,
    create: allyService.createAlly,
    update: allyService.updateAlly,
    delete: allyService.deleteAlly,
    toggleStatus: allyService.toggleAllyStatus
};

const Allies = () => {
    const { user } = useAuth();
    
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
        isDetailOpen,
        isDeleteOpen,
        isToggleOpen,
        isEditMode,
        openCreateForm,
        openEditForm,
        openDetail,
        openDeleteConfirm,
        openToggleConfirm,
        closeAllModals,
        handleDelete,
        handleToggleStatus,
        handleFormSuccess,
        actionLoading
    } = useEntityCRUD({
        service: adaptedService,
        entityName: allyConfig.entityName,
        limit: 10
    });

    useAutoOpenModal(openDetail, allyService.getAlly);

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
                entityName={allyConfig.entityName}
                sections={allyConfig.formSections}
            />
            
            <AllyDetailModal
                isOpen={isDetailOpen}
                onClose={closeAllModals}
                ally={selectedItem}
            />
            
            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={closeAllModals}
                onConfirm={handleDelete}
                title={`Eliminar ${allyConfig.entityName}`}
                message={`¿Estás seguro de que deseas eliminar este ${allyConfig.entityName}?`}
                itemName={selectedItem?.name}
                loading={actionLoading}
            />
            
            <ConfirmToggleModal
                isOpen={isToggleOpen}
                onClose={closeAllModals}
                onConfirm={handleToggleStatus}
                entityName={allyConfig.entityName}
                name={selectedItem?.name}
                isActive={selectedItem?.isActive}
                loading={actionLoading}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestión de Aliados</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra tus aliados y transportistas</p>
                </div>
                
                <button 
                    onClick={openCreateForm}
                    className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <UserPlus size={20} />
                    Nuevo Aliado
                </button>
            </div>

            {/* Tabla genérica */}
            <EntityTable
                items={items}
                columns={allyConfig.columns}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar aliados por nombre, código..."
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                onView={openDetail}
                onEdit={openEditForm}
                onDelete={openDeleteConfirm}
                onToggleStatus={openToggleConfirm}
                entityName={allyConfig.entityName}
                entityNamePlural={allyConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                codeColor={allyConfig.codeColor}
            />
        </div>
    );
};

export default Allies;
