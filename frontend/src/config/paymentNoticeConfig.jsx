// Configuración de columnas para la tabla de Avisos de Cobro
export const paymentNoticeConfig = {
    entityName: 'aviso de cobro',
    entityNamePlural: 'avisos de cobro',

    columns: [
        {
            header: 'Número',
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-purple-50 text-purple-600 border-purple-200">
                    AVC-{String(item.number).padStart(5, '0')}
                </span>
            )
        },
        {
            header: 'Fecha',
            accessor: 'issueDate',
            render: (item) => (
                <span className="text-slate-500 text-sm">
                    {new Date(item.issueDate || item.createdAt).toLocaleDateString('es-VE')}
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
            header: 'Origen',
            accessor: 'quote',
            render: (item) => {
                if (item.quote) {
                    return (
                        <span className="px-2 py-1 text-xs rounded border bg-blue-50 text-blue-600 border-blue-200">
                            COT-{String(item.quote.number).padStart(5, '0')}
                        </span>
                    );
                }
                if (item.deliveryNote) {
                    return (
                        <span className="px-2 py-1 text-xs rounded border bg-emerald-50 text-emerald-600 border-emerald-200">
                            NDE-{String(item.deliveryNote.number).padStart(5, '0')}
                        </span>
                    );
                }
                return <span className="text-slate-400 text-xs">—</span>;
            }
        },
        {
            header: 'Total',
            accessor: 'totalAmount',
            render: (item) => (
                <span className="font-bold text-slate-700">
                    ${parseFloat(item.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Estado Cobro',
            accessor: 'receivable',
            render: (item) => {
                const statusMap = {
                    PENDING:        { label: 'Pendiente',  color: 'bg-amber-50 text-amber-600 border-amber-200' },
                    PARTIALLY_PAID: { label: 'Abonada',   color: 'bg-blue-50 text-blue-600 border-blue-200' },
                    PAID:           { label: 'Pagada',    color: 'bg-green-50 text-green-600 border-green-200' },
                };
                const status = item.receivable?.status;
                const cfg = statusMap[status] || statusMap.PENDING;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.color}`}>
                        {cfg.label}
                    </span>
                );
            }
        },
    ]
};
