import { MapPin, FileText, Hash } from 'lucide-react';

/**
 * Configuración para la entidad Zona
 */
export const zoneConfig = {
    entityName: 'zona',
    entityNamePlural: 'zonas',
    codeColor: 'purple',
    
    // Columnas de la tabla
    columns: [
        {
            header: 'Código',
            accessor: 'internalCode',
            render: (item, colorClass) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
                    {item.internalCode}
                </span>
            )
        },
        {
            header: 'Zona',
            accessor: 'name',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-purple-500" />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Descripción',
            accessor: 'description',
            render: (item) => (
                <span className="text-sm text-slate-500 truncate max-w-[300px] block">
                    {item.description || <span className="italic text-slate-400">Sin descripción</span>}
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
                    {item.isActive ? 'Activa' : 'Inactiva'}
                </span>
            )
        }
    ],
    
    // Secciones del formulario
    formSections: [
        {
            title: 'Información de la Zona',
            icon: MapPin,
            columns: 1,
            fields: [
                {
                    name: 'internalCode',
                    label: 'Código Interno',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. ZON-0001 (dejar vacío para auto-generar)',
                    icon: Hash,
                    hint: '💡 Si dejas este campo vacío, se generará automáticamente'
                },
                {
                    name: 'name',
                    label: 'Nombre de la Zona',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. Zona 1 - Caracas Centro',
                    icon: MapPin
                },
                {
                    name: 'description',
                    label: 'Descripción',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Municipios, ciudades o áreas que cubre esta zona...',
                    rows: 3,
                    fullWidth: true
                }
            ]
        }
    ]
};

export default zoneConfig;
