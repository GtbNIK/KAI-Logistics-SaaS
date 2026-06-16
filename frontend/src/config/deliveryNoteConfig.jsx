// Configuración de columnas para la tabla de Notas de Entrega
import { toVenezuelanFormat } from '../utils/dateHelpers';

// Status map reutilizable para evitar duplicación (DRY principle)
const DELIVERY_NOTE_STATUS_MAP = {
    DRAFT:      { label: 'Borrador',   color: 'bg-slate-50 text-slate-600 border-slate-200' },
    DISPATCHED: { label: 'Despachada',  color: 'bg-blue-50 text-blue-600 border-blue-200' },
    DELIVERED:  { label: 'Entregada',   color: 'bg-green-50 text-green-600 border-green-200' },
    CANCELLED:  { label: 'Cancelada',   color: 'bg-red-50 text-red-600 border-red-200' },
};

export const deliveryNoteConfig = {
    entityName: 'nota de entrega',
    entityNamePlural: 'notas de entrega',
    statusFilterOptions: [
        { value: '', label: 'Todos los estados' },
        ...Object.entries(DELIVERY_NOTE_STATUS_MAP).map(([value, { label }]) => ({
            value,
            label
        }))
    ],

    columns: [
        {
            header: 'Número',
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200">
                    NDE-{String(item.number).padStart(5, '0')}
                </span>
            )
        },
        {
            header: 'Fecha',
            accessor: 'date',
            render: (item) => (
                <span className="text-slate-500 text-sm">
					{toVenezuelanFormat(item.date || item.createdAt)}
                </span>
            )
        },
        {
            header: 'Cliente',
            accessor: 'client',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{item.client?.name || 'N/A'}</span>
                    <span className="text-xs text-slate-400">{item.client?.rifOrId || ''}</span>
                </div>
            )
        },
        {
            header: 'Cotización',
            accessor: 'quote',
            render: (item) => item.quote
                ? (
                    <span className="px-2 py-1 text-xs rounded border bg-blue-50 text-blue-600 border-blue-200">
                        COT-{String(item.quote.number).padStart(5, '0')}
                    </span>
                )
                : <span className="text-slate-400 text-xs">—</span>
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (item) => {
                const cfg = DELIVERY_NOTE_STATUS_MAP[item.status] || DELIVERY_NOTE_STATUS_MAP.DRAFT;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.color}`}>
                        {cfg.label}
                    </span>
                );
            }
        },
    ]
};
