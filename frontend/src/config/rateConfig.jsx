import { DollarSign, Ship, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { toDateString, toVenezuelanFormat } from '../utils/dateHelpers';

export const rateConfig = {
    entityName: 'tarifa',
    entityNamePlural: 'tarifas',
    codeColor: 'red',

    columns: [
        {
            header: 'Aliado',
            accessor: 'ally',
            render: (item) => (
                <div>
                    <div className="text-sm font-medium text-slate-800">{item.ally?.name}</div>
                    <div className="text-xs text-slate-500">{item.ally?.internalCode}</div>
                </div>
            )
        },
        {
            header: 'Ruta',
            accessor: 'route',
            render: (item) => (
                <div>
                    <div className="text-sm text-slate-700">
                        {item.originPort?.code} → {item.destinationPort?.code}
                    </div>
                    <div className="text-xs text-slate-500">
                        {item.originPort?.name} - {item.destinationPort?.name}
                    </div>
                </div>
            )
        },
        {
            header: 'Venta 20HC',
            accessor: 'sale20HC',
            align: 'right',
            render: (item) => (
                <span className="text-sm font-semibold text-green-600">
                    ${item.sale20HC?.toFixed(2)}
                </span>
            )
        },
        {
            header: 'Venta 40HC',
            accessor: 'sale40HC',
            align: 'right',
            render: (item) => (
                <span className="text-sm font-semibold text-green-600">
                    ${item.sale40HC?.toFixed(2)}
                </span>
            )
        },
        {
            header: 'Línea Naviera',
            accessor: 'shippingLine',
            render: (item) => (
                <span className="text-sm text-slate-700">
                    {item.shippingLine?.name || '-'}
                </span>
            )
        },
        {
            header: 'Días Libres',
            accessor: 'freeDays',
            align: 'center',
            render: (item) => (
                <span className="text-sm text-slate-700">{item.freeDays} días</span>
            )
        },
        {
            header: 'Validez',
            accessor: 'validUntil',
            render: (item) => {
                const formatDate = (dateStr) => {
                    if (!dateStr) return '-';
                    const s = toDateString(dateStr);
                    return s ? toVenezuelanFormat(s) : '-';
                };
                
                return (
                    <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-700">{formatDate(item.validUntil)}</span>
                    </div>
                );
            }
        },
        {
            header: 'Estado',
            accessor: 'status',
            align: 'center',
            render: (item) => {
                const isExpired = new Date(item.validUntil) < new Date();
                return isExpired ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        <AlertCircle size={12} />
                        Expirada
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Vigente
                    </span>
                );
            }
        }
    ],

    formSections: [
        {
            title: 'Información General',
            icon: Ship,
            columns: 2,
            fields: [
                {
                    name: 'allyId',
                    label: 'Aliado',
                    type: 'select',
                    required: true,
                    placeholder: 'Seleccionar aliado...',
                    options: [] // Se inyectan dinámicamente desde Rates.jsx
                },
                {
                    name: 'shippingLineId',
                    label: 'Línea Naviera',
                    type: 'select',
                    required: false,
                    placeholder: 'Seleccionar línea naviera...',
                    options: [] // Se inyectan dinámicamente desde Rates.jsx
                },
                {
                    name: 'originPortId',
                    label: 'Puerto de Salida',
                    type: 'select',
                    required: true,
                    placeholder: 'Seleccionar puerto de salida...',
                    options: [] // Se inyectan dinámicamente desde Rates.jsx
                },
                {
                    name: 'destinationPortId',
                    label: 'Puerto de Llegada',
                    type: 'select',
                    required: true,
                    placeholder: 'Seleccionar puerto de llegada...',
                    options: [] // Se inyectan dinámicamente desde Rates.jsx
                }
            ]
        },
        {
            title: 'Costos de Contenedores',
            icon: DollarSign,
            bgColor: 'bg-amber-50',
            columns: 2,
            fields: [
                {
                    name: 'cost20ft',
                    label: 'Costo 20ft (USD)',
                    type: 'number',
                    required: true,
                    step: '0.01',
                    min: '0',
                    placeholder: '0.00'
                },
                {
                    name: 'cost40ft',
                    label: 'Costo 40ft (USD)',
                    type: 'number',
                    required: true,
                    step: '0.01',
                    min: '0',
                    placeholder: '0.00'
                }
            ]
        },
        {
            title: 'Fees y Márgenes de Ganancia',
            icon: DollarSign,
            bgColor: 'bg-green-50',
            columns: 3,
            fields: [
                {
                    name: 'bankFee',
                    label: 'Bank Fee (USD)',
                    type: 'number',
                    required: true,
                    step: '0.01',
                    min: '0',
                    placeholder: '0.00'
                },
                {
                    name: 'profitYaho',
                    label: 'Profit Yaho (USD)',
                    type: 'number',
                    required: true,
                    step: '0.01',
                    min: '0',
                    placeholder: '0.00'
                },
                {
                    name: 'profitIS',
                    label: 'Profit IS (USD)',
                    type: 'number',
                    required: true,
                    step: '0.01',
                    min: '0',
                    placeholder: '0.00'
                }
            ]
        },
        {
            title: 'Detalles Adicionales',
            icon: Calendar,
            columns: 2,
            fields: [
                {
                    name: 'freeDays',
                    label: 'Días Libres',
                    type: 'number',
                    required: false,
                    defaultValue: 21,
                    min: '0',
                    placeholder: '21'
                },
                {
                    name: 'validUntil',
                    label: 'Validez',
                    type: 'date',
                    required: true
                },
                {
                    name: 'observations',
                    label: 'Observaciones',
                    type: 'textarea',
                    required: false,
                    rows: 3,
                    placeholder: 'Notas adicionales sobre esta tarifa...(saldrán luego en el PDF)',
                    fullWidth: true
                }
            ]
        }
    ]
};

export default rateConfig;
