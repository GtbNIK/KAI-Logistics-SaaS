import { User, FileText, MapPin, Building } from 'lucide-react';

/**
 * Configuración para la entidad Aliado
 */
export const allyConfig = {
    entityName: 'aliado',
    entityNamePlural: 'aliados',
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
            header: 'Aliado / Empresa',
            accessor: 'name',
            render: (item) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.name}</span>
                        {!item.isActive && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded border border-red-100">
                                Inactivo
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-slate-500">{item.rifOrId}</span>
                </div>
            )
        },
        {
            header: 'Contacto',
            accessor: 'contactInfo',
            render: (item) => (
                <span className="text-sm text-slate-600">{item.contactInfo}</span>
            )
        },
        {
            header: 'Ubicación',
            accessor: 'address',
            render: (item) => (
                <div className="flex items-start gap-2 max-w-[200px]">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-600 truncate">{item.address}</span>
                </div>
            )
        }
    ],
    
    // Secciones del formulario
    formSections: [
        {
            title: 'Información del Aliado',
            icon: Building,
            columns: 2,
            fields: [
                {
                    name: 'name',
                    label: 'Razón Social / Nombre',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. Transportes Express C.A.',
                    icon: User
                },
                {
                    name: 'internalCode',
                    label: 'Código Interno',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. ALL-0001 (opcional)',
                    icon: FileText,
                    helpText: 'Si no se especifica, se generará automáticamente'
                },
                {
                    name: 'rifOrId',
                    label: 'RIF / Cédula',
                    type: 'text',
                    required: false,
                    maxLength: 10,
                    placeholder: 'Ej. J-12345678-9',
                    icon: FileText
                }
            ]
        },
        {
            title: 'Información de Contacto',
            icon: User,
            columns: 1,
            fields: [
                {
                    name: 'contactInfo',
                    label: 'Contacto (Email, Teléfono, etc.)',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. contacto@empresa.com / +58 412 1234567',
                    fullWidth: true
                }
            ]
        },
        {
            title: 'Ubicación',
            icon: MapPin,
            columns: 1,
            fields: [
                {
                    name: 'address',
                    label: 'Dirección',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Dirección completa del aliado...',
                    rows: 2,
                    fullWidth: true
                }
            ]
        }
    ]
};

export default allyConfig;
