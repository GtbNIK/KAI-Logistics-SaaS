// Configuración de columnas para la tabla de Cuentas por Cobrar
export const receivableConfig = {
    entityName: 'cuenta por cobrar',
    entityNamePlural: 'cuentas por cobrar',

    columns: [
        {
            header: 'Cuenta',
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-purple-50 text-purple-600 border-purple-200">
                    CXC-{String(item.number || 0).padStart(5, '0')}
                </span>
            )
        },
        {
            header: 'Cliente',
            accessor: 'client',
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-800">
                        {item.paymentNotice?.client?.name || item.client?.name || 'N/A'}
                    </span>
                    <span className="text-xs text-slate-400">
                        {item.paymentNotice?.client?.rifOrId || item.client?.rifOrId || ''}
                    </span>
                </div>
            )
        },
        {
            header: 'Total',
            accessor: 'totalAmount',
            render: (item) => (
                <span className="text-slate-700">
                    ${parseFloat(item.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Abonado',
            accessor: 'paidAmount',
            render: (item) => (
                <span className="font-medium text-green-600">
                    ${parseFloat(item.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            header: 'Pendiente',
            accessor: 'balance',
            render: (item) => {
                const pending = parseFloat(item.totalAmount) - parseFloat(item.paidAmount || 0);
                return (
                    <span className="font-bold text-amber-600">
                        ${pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                );
            }
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (item) => {
                const statusMap = {
                    PENDING:        { label: 'Pendiente',  color: 'bg-amber-50 text-amber-600 border-amber-200' },
                    PARTIALLY_PAID: { label: 'Abonada',   color: 'bg-blue-50 text-blue-600 border-blue-200' },
                    PAID:           { label: 'Pagada',    color: 'bg-green-50 text-green-600 border-green-200' },
                };
                const cfg = statusMap[item.status] || statusMap.PENDING;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.color}`}>
                        {cfg.label}
                    </span>
                );
            }
        },
    ]
};
