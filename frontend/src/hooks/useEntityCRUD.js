import { useState, useEffect, useCallback } from 'react';

/**
 * Hook genérico para operaciones CRUD de cualquier entidad
 * @param {Object} params - Configuración del hook
 * @param {Object} params.service - Servicio con métodos de API (getAll, create, update, delete, toggleStatus)
 * @param {string} params.entityName - Nombre de la entidad para mensajes de error
 * @param {number} params.limit - Límites por página (default: 10)
 * @param {Function} params.onError - Callback opcional para manejar errores
 */
const useEntityCRUD = ({ 
    service, 
    entityName = 'elemento',
    limit = 10,
    hasStatusField = true, // Si la entidad tiene campo isActive
    onError
}) => {
    // Estado de datos
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estado de paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    
    // Estado de filtros
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [customFilters, setCustomFilters] = useState({});
    
    // Estado de modales
    const [selectedItem, setSelectedItem] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isToggleOpen, setIsToggleOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Estado de operaciones
    const [actionLoading, setActionLoading] = useState(false);

    // Función para obtener datos
    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { 
                page, 
                search, 
                limit,
                ...(hasStatusField && {
                    includeInactive: filterStatus === 'all' || filterStatus === 'inactive' ? 'true' : 'false'
                }),
                ...customFilters
            };
            
            // Asume que el servicio tiene un método getAll o similar
            const getMethod = service.getAll || service.getAllItems || service[`get${entityName}s`];
            const response = await getMethod(params);
            
            let filteredData = response.data || response;
            
            // Filtrar por estado en frontend solo si la entidad tiene campo isActive
            if (hasStatusField) {
                if (filterStatus === 'inactive') {
                    filteredData = filteredData.filter(item => !item.isActive);
                } else if (filterStatus === 'active') {
                    filteredData = filteredData.filter(item => item.isActive);
                }
            }
            
            setItems(filteredData);
            setTotalItems(response.meta?.total || filteredData.length);
            setTotalPages(response.meta?.last_page || Math.ceil(filteredData.length / limit));
        } catch (err) {
            console.error(`Error fetching ${entityName}s:`, err);
            setError(err.response?.data?.message || `Error al cargar ${entityName}s`);
            onError?.(err);
        } finally {
            setLoading(false);
        }
    }, [page, search, filterStatus, customFilters, service, entityName, limit, hasStatusField, onError]);

    // Efecto para búsqueda con debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setPage(1);
            fetchItems();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [search, filterStatus, customFilters]);

    // Efecto para cambio de página
    useEffect(() => {
        fetchItems();
    }, [page]);

    // Handlers de modales
    const openCreateForm = useCallback(() => {
        setSelectedItem(null);
        setIsEditMode(false);
        setIsFormOpen(true);
    }, []);

    const openEditForm = useCallback((item) => {
        setSelectedItem(item);
        setIsEditMode(true);
        setIsFormOpen(true);
    }, []);

    const openDetail = useCallback((item) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    }, []);

    const openDeleteConfirm = useCallback((item) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    }, []);

    const openToggleConfirm = useCallback((item, e) => {
        e?.stopPropagation();
        setSelectedItem(item);
        setIsToggleOpen(true);
    }, []);

    const closeAllModals = useCallback(() => {
        setIsFormOpen(false);
        setIsDetailOpen(false);
        setIsDeleteOpen(false);
        setIsToggleOpen(false);
        setIsEditMode(false);
        setSelectedItem(null);
    }, []);

    // Handlers de operaciones
    const handleDelete = useCallback(async () => {
        if (!selectedItem) return;
        setActionLoading(true);
        try {
            const deleteMethod = service.delete || service.deleteItem || service[`delete${entityName}`];
            await deleteMethod(selectedItem.id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
            fetchItems();
        } catch (err) {
            console.error(`Error deleting ${entityName}:`, err);
            alert(err.response?.data?.message || `Error al eliminar ${entityName}`);
        } finally {
            setActionLoading(false);
        }
    }, [selectedItem, service, entityName, fetchItems]);

    const handleToggleStatus = useCallback(async () => {
        if (!selectedItem) return;
        setActionLoading(true);
        try {
            const toggleMethod = service.toggleStatus || service.toggleItemStatus;
            await toggleMethod(selectedItem.id);
            setIsToggleOpen(false);
            setSelectedItem(null);
            fetchItems();
        } catch (err) {
            console.error(`Error toggling ${entityName} status:`, err);
            alert(err.response?.data?.message || `Error al cambiar estado del ${entityName}`);
        } finally {
            setActionLoading(false);
        }
    }, [selectedItem, service, entityName, fetchItems]);

    const handleFormSuccess = useCallback(() => {
        closeAllModals();
        fetchItems();
    }, [closeAllModals, fetchItems]);

    // Paginación
    const nextPage = useCallback(() => {
        setPage(p => Math.min(totalPages, p + 1));
    }, [totalPages]);

    const prevPage = useCallback(() => {
        setPage(p => Math.max(1, p - 1));
    }, []);

    return {
        // Datos
        items,
        loading,
        error,
        
        // Paginación
        page,
        totalPages,
        totalItems,
        setPage,
        nextPage,
        prevPage,
        
        // Filtros
        search,
        setSearch,
        filterStatus,
        setFilterStatus,
        customFilters,
        setCustomFilters,
        
        // Item seleccionado
        selectedItem,
        setSelectedItem,
        
        // Estados de modales
        isFormOpen,
        isDetailOpen,
        isDeleteOpen,
        isToggleOpen,
        isEditMode,
        
        // Handlers de modales
        openCreateForm,
        openEditForm,
        openDetail,
        openDeleteConfirm,
        openToggleConfirm,
        closeAllModals,
        
        // Handlers de operaciones
        handleDelete,
        handleToggleStatus,
        handleFormSuccess,
        actionLoading,
        
        // Refetch manual
        refetch: fetchItems
    };
};

export default useEntityCRUD;
