import { useState } from 'react';
import { MapPin, Anchor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useEffectiveRole } from '../../hooks/useEffectiveRole';
import zoneService from '../../services/zone.service';
import { zoneConfig } from '../../config/zoneConfig.jsx';
import portService from '../../services/port.service';
import { portConfig } from '../../config/portConfig.jsx';
import useEntityCRUD from '../../hooks/useEntityCRUD';
import EntityTable from '../../components/shared/EntityTable';
import EntityFormModal from '../../components/shared/EntityFormModal';
import ConfirmDeleteModal from '../../components/modals/ConfirmDeleteModal';
import ZoneDetailModal from '../../components/zones/ZoneDetailModal';
import PortDetailModal from '../../components/ports/PortDetailModal';
import ConfirmToggleModal from '../../components/modals/ConfirmToggleModal.jsx';

// Adaptar servicio para el hook
const adaptedService = {
    getAll: zoneService.getZones,
    create: zoneService.createZone,
    update: zoneService.updateZone,
    delete: zoneService.deleteZone,
    toggleStatus: zoneService.toggleStatus
};

const adaptedPortService = {
	getAll: portService.getPorts,
	create: portService.createPort,
	update: portService.updatePort,
	delete: portService.deletePort,
	toggleStatus: portService.toggleStatus
};

const Zones = () => {
    const { user } = useAuth();
    const effectiveRole = useEffectiveRole();
    const [detailItem, setDetailItem] = useState(null);
	const [portDetailItem, setPortDetailItem] = useState(null);
	const [activeTab, setActiveTab] = useState('zones');
    
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

	const {
		items: portItems,
		loading: portLoading,
		page: portPage,
		totalPages: portTotalPages,
		totalItems: portTotalItems,
		search: portSearch,
		setSearch: setPortSearch,
		filterStatus: portFilterStatus,
		setFilterStatus: setPortFilterStatus,
		setPage: setPortPage,
		selectedItem: selectedPort,
		isFormOpen: isPortFormOpen,
		isDeleteOpen: isPortDeleteOpen,
		isToggleOpen: isPortToggleOpen,
		isEditMode: isPortEditMode,
		openCreateForm: openCreatePortForm,
		openEditForm: openEditPortForm,
		openDeleteConfirm: openDeletePortConfirm,
		openToggleConfirm: openTogglePortConfirm,
		closeAllModals: closeAllPortModals,
		handleDelete: handleDeletePort,
		handleToggleStatus: handleTogglePortStatus,
		handleFormSuccess: handlePortFormSuccess,
		actionLoading: portActionLoading
	} = useEntityCRUD({
		service: adaptedPortService,
		entityName: portConfig.entityName,
		limit: 10,
		hasStatusField: true
	});

    // Handler para ver detalle
    const handleViewDetail = (item) => {
        setDetailItem(item);
    };

	const handleViewPortDetail = (item) => {
		setPortDetailItem(item);
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

			<EntityFormModal
				isOpen={isPortFormOpen}
				onClose={closeAllPortModals}
				onSuccess={handlePortFormSuccess}
				editMode={isPortEditMode}
				entityData={selectedPort}
				service={adaptedPortService}
				entityName={portConfig.entityName}
				sections={portConfig.formSections}
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
				isOpen={isPortDeleteOpen}
				onClose={closeAllPortModals}
				onConfirm={handleDeletePort}
				title={`Desactivar ${portConfig.entityName}`}
				message={`¿Estás seguro de que deseas desactivar este ${portConfig.entityName}? Podrás reactivarlo después.`}
				itemName={selectedPort?.name}
				loading={portActionLoading}
			/>

            <ConfirmToggleModal
                isOpen={isToggleOpen}
                onClose={closeAllModals}
                onConfirm={handleToggleStatus}
                entityName={zoneConfig.entityName}
                name={selectedItem?.name}
                isActive={selectedItem?.isActive}
                loading={actionLoading}
            />

			<ConfirmToggleModal
				isOpen={isPortToggleOpen}
				onClose={closeAllPortModals}
				onConfirm={handleTogglePortStatus}
				entityName={portConfig.entityName}
				name={selectedPort?.name}
				isActive={selectedPort?.isActive}
				loading={portActionLoading}
			/>

            <ZoneDetailModal
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                zone={detailItem}
            />

			<PortDetailModal
				isOpen={!!portDetailItem}
				onClose={() => setPortDetailItem(null)}
				port={portDetailItem}
			/>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Zonas / Puertos</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra las zonas y el catálogo de puertos</p>
                </div>
                
                {effectiveRole === 'ADMIN' && (
					<button
						onClick={() => (activeTab === 'ports' ? openCreatePortForm() : openCreateForm())}
						className="bg-secondary hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all active:scale-95"
					>
						{activeTab === 'ports' ? <Anchor size={20} /> : <MapPin size={20} />}
						{activeTab === 'ports' ? 'Nuevo Puerto' : 'Nueva Zona'}
					</button>
                )}
            </div>

			<div className="flex items-center gap-2">
				<button
					onClick={() => setActiveTab('zones')}
					className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
						activeTab === 'zones'
							? 'bg-purple-50 text-purple-700 border-purple-200'
							: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
					}`}
				>
					Zonas
				</button>
				<button
					onClick={() => setActiveTab('ports')}
					className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
						activeTab === 'ports'
							? 'bg-blue-50 text-blue-700 border-blue-200'
							: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
					}`}
				>
					Puertos
				</button>
			</div>

			{activeTab === 'zones' ? (
				<EntityTable
					items={items}
					columns={zoneConfig.columns}
					loading={loading}
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Buscar zonas por nombre, código..."
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
					canDelete={effectiveRole === 'ADMIN'}
					showToggle={effectiveRole === 'ADMIN'}
					showStatusFilter={true}
					codeColor={zoneConfig.codeColor}
				/>
			) : (
				<EntityTable
					items={portItems}
					columns={portConfig.columns}
					loading={portLoading}
					search={portSearch}
					onSearchChange={setPortSearch}
					searchPlaceholder="Buscar puertos por nombre, código..."
					page={portPage}
					totalPages={portTotalPages}
					totalItems={portTotalItems}
					onPageChange={setPortPage}
					filterStatus={portFilterStatus}
					onFilterStatusChange={setPortFilterStatus}
					onView={handleViewPortDetail}
					onEdit={openEditPortForm}
					onDelete={openDeletePortConfirm}
					onToggleStatus={openTogglePortConfirm}
					entityName={portConfig.entityName}
					entityNamePlural={portConfig.entityNamePlural}
					canDelete={effectiveRole === 'ADMIN'}
					showToggle={effectiveRole === 'ADMIN'}
					showStatusFilter={true}
					codeColor={portConfig.codeColor}
				/>
			)}
        </div>
    );
};

export default Zones;
