import { Search, ChevronLeft, ChevronRight, Edit, Trash2, Eye, Power, Filter, Printer } from 'lucide-react';

/**
 * Tabla genérica para listar cualquier entidad
 * @param {Object} props
 * @param {Array} props.items - Array de elementos a mostrar
 * @param {Array} props.columns - Configuración de columnas
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.search - Valor de búsqueda
 * @param {Function} props.onSearchChange - Handler de cambio de búsqueda
 * @param {number} props.page - Página actual
 * @param {number} props.totalPages - Total de páginas
 * @param {number} props.totalItems - Total de elementos
 * @param {Function} props.onPageChange - Handler de cambio de página
 * @param {string} props.filterStatus - Filtro de estado actual
 * @param {Function} props.onFilterStatusChange - Handler de cambio de filtro
 * @param {Function} props.onView - Handler para ver detalle
 * @param {Function} props.onPrint - Handler para imprimir
 * @param {Function} props.onEdit - Handler para editar
 * @param {Function} props.onDelete - Handler para eliminar
 * @param {Function} props.onToggleStatus - Handler para cambiar estado
 * @param {string} props.entityName - Nombre de la entidad (para mensajes)
 * @param {boolean} props.canDelete - Si el usuario puede eliminar
 * @param {boolean} props.canEdit - Si el usuario puede editar
 * @param {boolean} props.canPrint - Si el usuario puede imprimir
 * @param {Object} props.extraFilters - Filtros adicionales (componente React)
 */
const EntityTable = ({
    items = [],
    columns = [],
    loading = false,
    search = '',
    onSearchChange,
    page = 1,
    totalPages = 1,
    totalItems = 0,
    onPageChange,
    filterStatus = 'active',
    onFilterStatusChange,
    onView,
    onPrint,
    onEdit,
    onDelete,
    onToggleStatus,
    entityName = 'elemento',
    entityNamePlural = 'elementos',
    canDelete = true,
    canEdit = true,
    canPrint = false,
    showToggle = true,
    showStatusFilter = true, // Nuevo: controla si se muestra el filtro de estado
    extraFilters = null,
    extraActions = null,
    codeColor = 'blue', // Color del badge de código (blue, purple, green, etc.)
    searchPlaceholder
}) => {
    
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100'
    };

    return (
        <div className="space-y-4">
            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder={searchPlaceholder || `Buscar ${entityNamePlural}...`}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                            value={search}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                    </div>
                    
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-500 text-sm font-medium">Total:</span>
                        <span className="text-slate-800 font-bold">{totalItems}</span>
                    </div>
                </div>
                
                {/* Filtros */}
                {(showStatusFilter || extraFilters) && (
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-400" />
                            <span className="text-sm font-medium text-slate-600">Filtros:</span>
                        </div>
                        
                        {showStatusFilter && (
                            <select
                                value={filterStatus}
                                onChange={(e) => onFilterStatusChange?.(e.target.value)}
                                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light/20 focus:border-primary-light transition-all text-slate-700"
                            >
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                                <option value="all">Todos</option>
                            </select>
                        )}
                        
                        {extraFilters}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {columns.map((col, index) => (
                                    <th 
                                        key={index}
                                        className={`px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                // Skeleton loader
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {columns.map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                            </td>
                                        ))}
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-3 bg-slate-50 rounded-full">
                                                <Search size={24} />
                                            </div>
                                            <p>No se encontraron {entityNamePlural}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                        onClick={() => onView?.(item)}
                                    >
                                        {columns.map((col, index) => (
                                            <td key={index} className="px-6 py-4">
                                                {col.render ? col.render(item, colorClasses[codeColor]) : item[col.accessor]}
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                                    title="Ver Detalle"
                                                    onClick={() => onView?.(item)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {showToggle && (
                                                    <button 
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            item.isActive 
                                                                ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' 
                                                                : 'text-slate-400 hover:text-green-500 hover:bg-green-50'
                                                        }`}
                                                        title={item.isActive ? `Desactivar ${entityName}` : `Activar ${entityName}`}
                                                        onClick={(e) => onToggleStatus?.(item, e)}
                                                    >
                                                        <Power size={18} />
                                                    </button>
                                                )}
                                                {canPrint && (
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors" 
                                                        title="Imprimir"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onPrint?.(item);
                                                        }}
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                )}
                                                {(typeof canEdit === 'function' ? canEdit(item) : canEdit) && (
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-primary-light hover:bg-blue-50 rounded-lg transition-colors" 
                                                        title="Editar"
                                                        onClick={() => onEdit?.(item)}
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                                {(typeof canDelete === 'function' ? canDelete(item) : canDelete) && (
                                                    <button 
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                                                        title="Eliminar"
                                                        onClick={() => onDelete?.(item)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                {extraActions && extraActions(item)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500">
                        Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onPageChange?.(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EntityTable;
