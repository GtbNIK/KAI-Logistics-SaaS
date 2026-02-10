import { FileText, Calendar, Wallet } from 'lucide-react';

export const quoteConfig = {
    entityName: 'Cotización',
    entityNamePlural: 'Cotizaciones',
    
    // Columnas de la tabla
    columns: [
        { 
            header: 'Número', 
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-medium rounded-md border bg-blue-50 text-blue-600 border-blue-200">
                    COT-{String(item.number).padStart(5, '0')}
                </span>
            )
        },
        { 
            header: 'Fecha', 
            accessor: 'date',
            render: (item) => new Date(item.date || item.createdAt).toLocaleDateString('es-VE')
        },
        { 
            header: 'Cliente', 
            accessor: 'client',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{item.client?.name || 'Cliente Eliminado'}</span>
                </div>
            )
        },
        { 
            header: 'Items', 
            accessor: '_count',
            render: (item) => (
                <span className="text-slate-600">{item._count?.items || 0} servicio(s)</span>
            )
        },
        { 
            header: 'Monto Total', 
            accessor: 'totalAmount',
            render: (item) => (
                <span className="font-bold text-slate-700">
                    ${parseFloat(item.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        { 
            header: 'Estado', 
            accessor: 'status',
            render: (item) => {
                const statusMap = {
                    DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                    SENT: { label: 'Enviada', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                    APPROVED: { label: 'Aprobada', color: 'bg-green-50 text-green-600 border-green-200' },
                    REJECTED: { label: 'Rechazada', color: 'bg-red-50 text-red-600 border-red-200' },
                    CONVERTED: { label: 'Convertida', color: 'bg-purple-50 text-purple-600 border-purple-200' }
                };
                const config = statusMap[item.status] || statusMap.DRAFT;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
                        {config.label}
                    </span>
                );
            }
        },
        { 
            header: 'Válida Hasta', 
            accessor: 'validUntil',
            render: (item) => {
                if (!item.validUntil) return <span className="text-slate-400">-</span>;
                const validDate = new Date(item.validUntil);
                const today = new Date();
                const isExpired = validDate < today && item.status === 'SENT';
                return (
                    <span className={isExpired ? 'text-red-500 font-medium' : 'text-slate-600'}>
                        {validDate.toLocaleDateString('es-VE')}
                    </span>
                );
            }
        }
    ],

    // Configuración de filtros
    filters: [
        {
            key: 'status',
            label: 'Estado',
            type: 'select',
            options: [
                { value: 'DRAFT', label: 'Borrador' },
                { value: 'SENT', label: 'Enviada' },
                { value: 'APPROVED', label: 'Aprobada' },
                { value: 'REJECTED', label: 'Rechazada' },
                { value: 'CONVERTED', label: 'Convertida' }
            ]
        }
    ]
};
