import { Package, FileText, Tag } from 'lucide-react';

// Mapeo de tipos de servicio a etiquetas y colores
const serviceTypeLabels = {
    DOOR_TO_DOOR: { label: 'Puerta a Puerta', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    FCL_20: { label: 'Contenedor 20\'', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    FCL_40: { label: 'Contenedor 40\'', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    FCL_40HC: { label: 'Contenedor 40\' HC', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    LCL: { label: 'Carga Suelta (LCL)', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    AIR: { label: 'Aéreo', color: 'bg-sky-50 text-sky-600 border-sky-100' },
    WAREHOUSE: { label: 'Almacenaje', color: 'bg-green-50 text-green-600 border-green-100' },
    CUSTOMS: { label: 'Aduana', color: 'bg-red-50 text-red-600 border-red-100' },
    OTHER: { label: 'Otro', color: 'bg-slate-50 text-slate-600 border-slate-100' }
};

/**
 * Configuración para la entidad Servicio
 */
export const serviceConfig = {
    entityName: 'servicio',
    entityNamePlural: 'servicios',
    codeColor: 'green',
    
    // Columnas de la tabla
    columns: [
        {
            header: 'Código',
            accessor: 'code',
            render: (item, colorClass) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
                    {item.code}
                </span>
            )
        },
        {
            header: 'Servicio',
            accessor: 'name',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <Package size={16} className="text-slate-400" />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Tipo',
            accessor: 'type',
            render: (item) => {
                const typeInfo = serviceTypeLabels[item.type] || serviceTypeLabels.OTHER;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${typeInfo.color}`}>
                        {typeInfo.label}
                    </span>
                );
            }
        },
        {
            header: 'Notas',
            accessor: 'notes',
            render: (item) => (
                <span className="text-sm text-slate-500 truncate max-w-[200px] block">
                    {item.notes || <span className="italic text-slate-400">Sin notas</span>}
                </span>
            )
        },
        {
            header: 'Tarifas',
            accessor: '_count',
            align: 'right',
            render: (item) => (
                <span className="text-sm text-slate-600">
                    {item._count?.rates || 0} tarifa{item._count?.rates !== 1 ? 's' : ''}
                </span>
            )
        },
        {
            header: 'Estado',
            accessor: 'isActive',
            align: 'center',
            render: (item) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    item.isActive 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                    {item.isActive ? 'Activo' : 'Inactivo'}
                </span>
            )
        }
    ],
    
    // Secciones del formulario
    formSections: [
        {
            title: 'Información del Servicio',
            icon: Package,
            columns: 2,
            fields: [
                {
                    name: 'code',
                    label: 'Código',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. FLT-001',
                    icon: FileText
                },
                {
                    name: 'name',
                    label: 'Nombre del Servicio',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. Flete Terrestre Nacional'
                },
                {
                    name: 'type',
                    label: 'Tipo de Servicio',
                    type: 'select',
                    required: true,
                    placeholder: 'Seleccionar tipo...',
                    options: [
                        { value: 'DOOR_TO_DOOR', label: 'Puerta a Puerta' },
                        { value: 'FCL_20', label: 'Contenedor 20\'' },
                        { value: 'FCL_40', label: 'Contenedor 40\'' },
                        { value: 'FCL_40HC', label: 'Contenedor 40\' HC' },
                        { value: 'LCL', label: 'Carga Suelta (LCL)' },
                        { value: 'AIR', label: 'Aéreo' },
                        { value: 'WAREHOUSE', label: 'Almacenaje' },
                        { value: 'CUSTOMS', label: 'Aduana' },
                        { value: 'OTHER', label: 'Otro' }
                    ],
                    icon: Tag
                }
            ]
        },
        {
            title: 'Detalles Adicionales',
            icon: FileText,
            columns: 1,
            fields: [
                {
                    name: 'notes',
                    label: 'Notas / Descripción',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Información adicional sobre el servicio...',
                    rows: 3,
                    fullWidth: true
                }
            ]
        }
    ]
};

export { serviceTypeLabels };
export default serviceConfig;
