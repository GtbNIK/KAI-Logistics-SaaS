import { User, FileText, Mail, Phone, MapPin, Building } from 'lucide-react';

/**
 * Configuración para la entidad Cliente
 */
export const clientConfig = {
    entityName: 'cliente',
    entityNamePlural: 'clientes',
    codeColor: 'blue',
    
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
            header: 'Cliente / Empresa',
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
            accessor: 'contactPerson',
            render: (item) => (
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-600">{item.contactPerson}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={12} /> {item.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone size={12} /> {item.phone}
                    </div>
                </div>
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
            title: 'Identificación',
            icon: Building,
            columns: 2,
            fields: [
                {
                    name: 'name',
                    label: 'Razón Social / Nombre',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. Comercial ABC C.A.',
                    icon: User
                },
                {
                    name: 'rifOrId',
                    label: 'RIF / Cédula',
                    type: 'text',
                    required: true,
                    maxLength: 10,
                    placeholder: 'Ej. J-12345678-9',
                    icon: FileText
                }
            ]
        },
        {
            title: 'Información de Contacto',
            icon: User,
            columns: 2,
            fields: [
                {
                    name: 'contactPerson',
                    label: 'Persona de Contacto',
                    type: 'text',
                    required: true,
                    placeholder: 'Nombre del contacto principal',
                    icon: User
                },
                {
                    name: 'email',
                    label: 'Correo Electrónico',
                    type: 'email',
                    required: true,
                    placeholder: 'correo@empresa.com',
                    icon: Mail
                },
                {
                    name: 'phone',
                    label: 'Teléfono',
                    type: 'phone',
                    required: true,
                    placeholder: '+58 412 1234567',
                    icon: Phone
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
                    label: 'Dirección Fiscal',
                    type: 'textarea',
                    required: true,
                    placeholder: 'Dirección completa...',
                    rows: 2,
                    fullWidth: true
                },
                {
                    name: 'deliveryAddress',
                    label: 'Dirección de Entrega',
                    type: 'textarea',
                    required: false,
                    placeholder: 'Si es diferente a la dirección fiscal...',
                    rows: 2,
                    fullWidth: true
                },
                {
                    name: 'referencePoint',
                    label: 'Punto de Referencia',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. Frente a la Plaza Bolívar',
                    fullWidth: true
                }
            ]
        },
        {
            title: 'Detalles del Cliente',
            icon: FileText,
            columns: 1,
            fields: [
                {
                    name: 'clientDetails',
                    label: 'Información Adicional',
                    type: 'textarea',
                    required: false,
                    placeholder: '¿Qué productos/servicios solicita usualmente este cliente? ¿Alguna nota importante?',
                    rows: 3
                }
            ]
        },
        {
            title: 'Asignación',
            icon: User,
            columns: 1,
            fields: [
                {
                    name: 'assignedToId',
                    label: 'Asignar a Vendedor',
                    type: 'select',
                    required: false,
                    placeholder: 'Seleccionar vendedor',
                    options: [] // Se cargará dinámicamente en Clients.jsx
                }
            ]
        }
    ]
};

export default clientConfig;
