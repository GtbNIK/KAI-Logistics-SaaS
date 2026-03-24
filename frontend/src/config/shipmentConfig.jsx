// Configuración de columnas para la tabla de Embarques/Tracking
export const shipmentConfig = {
    entityName: 'embarque',
    entityNamePlural: 'embarques',

    columns: [
        {
            header: 'Nro.',
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-sky-50 text-sky-600 border-sky-200">
                    EMB-{String(item.number || 0).padStart(5, '0')}
                </span>
            )
        },
        {
            header: 'Tipo',
            accessor: 'type',
            render: (item) => {
                const typeStyles = {
                    FCL: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                    D2D: 'bg-teal-50 text-teal-600 border-teal-200',
                };
                const typeLabels = { FCL: 'FCL', D2D: 'Door to Door' };
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${typeStyles[item.type] || ''}`}>
                        {typeLabels[item.type] || item.type}
                    </span>
                );
            }
        },
        {
            header: 'Cliente',
            accessor: 'clientName',
            render: (item) => (
                <span className="font-medium text-slate-800">
                    {item.clientName || item.paymentNotice?.client?.name || 'N/A'}
                </span>
            )
        },
        {
            header: 'BL',
            accessor: 'blNumber',
            render: (item) => (
                <span className="text-slate-600 font-mono text-xs">
                    {item.blNumber || '—'}
                </span>
            )
        },
        {
            header: 'Ruta / Puerto',
            accessor: 'route',
            render: (item) => {
                if (item.type === 'FCL' && item.originPort && item.destPort) {
                    return <span className="text-slate-600 text-xs">{item.originPort} → {item.destPort}</span>;
                }
                if (item.type === 'D2D' && item.originPort) {
                    return <span className="text-slate-600 text-xs">{item.originPort}</span>;
                }
                return <span className="text-slate-400 text-xs">—</span>;
            }
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (item) => {
                const statusMap = {
                    PENDING:             { label: 'Pendiente',       color: 'bg-amber-50 text-amber-600 border-amber-200' },
                    AT_ORIGIN_WAREHOUSE: { label: 'En Almacén Origen', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                    ON_VESSEL:           { label: 'En Tránsito',     color: 'bg-blue-50 text-blue-600 border-blue-200' },
                    AT_DESTINATION_PORT: { label: 'En Puerto Destino', color: 'bg-purple-50 text-purple-600 border-purple-200' },
                    CUSTOMS_CLEARANCE:   { label: 'En Aduana',       color: 'bg-pink-50 text-pink-600 border-pink-200' },
                    DELIVERED:           { label: 'Entregado',       color: 'bg-green-50 text-green-600 border-green-200' },
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
