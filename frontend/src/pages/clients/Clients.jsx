import { UserPlus, FileUp, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import clientService from '../../services/client.service';
import { clientConfig } from '../../config/clientConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ClientDetailModal from '../../components/clients/ClientDetailModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal';
import ImportExcelModal from '../../components/modals/ImportExcelModal';
import { useState } from 'react';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: clientService.getClients,
    create: clientService.createClient,
    update: clientService.updateClient,
    delete: clientService.deleteClient,
    toggleStatus: clientService.toggleClientStatus
};

const Clients = () => {
    const { user } = useAuth();
    const [isImportOpen, setIsImportOpen] = useState(false);
    
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
        actionLoading,
        refetch
    } = useEntityCRUD({
        service: adaptedService,
        entityName: clientConfig.entityName,
        limit: 10
    });

    // Exportar a Excel
    const handleExportExcel = async () => {
        try {
            const response = await clientService.getClients({ 
                all: 'true',
                includeInactive: filterStatus === 'all' || filterStatus === 'inactive' ? 'true' : 'false'
            });
            
            let dataToExport = response.data;
            
            if (filterStatus === 'inactive') {
                dataToExport = dataToExport.filter(c => !c.isActive);
            } else if (filterStatus === 'active') {
                dataToExport = dataToExport.filter(c => c.isActive);
            }
            
            const excelData = dataToExport.map(client => ({
                'Código': client.internalCode,
                'Nombre': client.name,
                'RIF/Cédula': client.rifOrId,
                'Email': client.email,
                'Teléfono': client.phone,
                'Contacto': client.contactPerson,
                'Dirección': client.address,
                'Dirección de Entrega': client.deliveryAddress,
                'Referencia': client.referencePoint || '',
                'Estado': client.isActive ? 'Activo' : 'Inactivo',
                'Fecha de Registro': new Date(client.createdAt).toLocaleDateString('es-VE')
            }));
            
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
            XLSX.writeFile(wb, `Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Error al exportar clientes');
        }
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
                entityName={clientConfig.entityName}
                sections={clientConfig.formSections}
            />
            
            <ClientDetailModal
                isOpen={isDetailOpen}
                onClose={closeAllModals}
                client={selectedItem}
            />
            
            <ConfirmDeleteModal
                isOpen={isDeleteOpen}
                onClose={closeAllModals}
                onConfirm={handleDelete}
                title={`Eliminar ${clientConfig.entityName}`}
                message={`¿Estás seguro de que deseas eliminar este ${clientConfig.entityName}?`}
                itemName={selectedItem?.name}
                loading={actionLoading}
            />
            
            <ConfirmToggleModal
                isOpen={isToggleOpen}
                onClose={closeAllModals}
                onConfirm={handleToggleStatus}
                clientName={selectedItem?.name}
                isActive={selectedItem?.isActive}
                loading={actionLoading}
            />

            <ImportExcelModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={refetch}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestión de Clientes</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra tu cartera de clientes y prospectos</p>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={handleExportExcel}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
                        title="Exportar a Excel"
                    >
                        <FileUp size={20} />
                        Exportar
                    </button>
                    <button 
                        onClick={() => setIsImportOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
                        title="Importar desde Excel"
                    >
                        <FileDown size={20} />
                        Importar
                    </button>
                    <button 
                        onClick={openCreateForm}
                        className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <UserPlus size={20} />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Tabla genérica */}
            <EntityTable
                items={items}
                columns={clientConfig.columns}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
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
                entityName={clientConfig.entityName}
                entityNamePlural={clientConfig.entityNamePlural}
                canDelete={user?.role === 'ADMIN'}
                codeColor={clientConfig.codeColor}
            />
        </div>
    );
};

export default Clients;
