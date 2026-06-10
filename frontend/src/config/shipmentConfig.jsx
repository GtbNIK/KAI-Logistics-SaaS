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
                    CONSOLIDADO: 'bg-purple-50 text-purple-600 border-purple-200',
                };
                const typeLabels = { FCL: 'FCL', D2D: 'Door to Door', CONSOLIDADO: 'Consolidado' };
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
                if (item.type === 'CONSOLIDADO' && item.arrivalPort) {
                    return <span className="text-slate-600 text-xs">→ {item.arrivalPort}</span>;
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
                    AT_ORIGIN_PORT:      { label: 'En Puerto Origen', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
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

// Construye columnas dinámicas según el tipo seleccionado
export const buildShipmentColumns = (typeFilter) => {
    // Columnas comunes
    const common = [
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
                    CONSOLIDADO: 'bg-purple-50 text-purple-600 border-purple-200',
                };
                const typeLabels = { FCL: 'FCL', D2D: 'D2D', CONSOLIDADO: 'Consolidado' };
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
    ];

    if (typeFilter === 'FCL') {
        return [
            ...common,
            {
                header: 'BL', accessor: 'blNumber',
                render: (item) => <span className="text-slate-600 font-mono text-xs">{item.blNumber || '—'}</span>
            },
            {
                header: 'Contenedores', accessor: 'containers',
                render: (item) => {
                    const list = item.containers?.length
                        ? item.containers.map(c => `${c.containerType}×${c.quantity}`).join(', ')
                        : (item.containerType && item.containerQty ? `${item.containerType}×${item.containerQty}` : '—');
                    return <span className="text-slate-600 text-xs">{list}</span>;
                }
            },
            {
                header: 'Ruta', accessor: 'route',
                render: (item) => (item.originPort && item.destPort)
                    ? <span className="text-slate-600 text-xs">{item.originPort} → {item.destPort}</span>
                    : <span className="text-slate-400 text-xs">—</span>
            },
            {
                header: 'Aliado', accessor: 'aliado',
                render: (item) => <span className="text-slate-600 text-xs">{item.aliado?.name || '—'}</span>
            },
            {
                header: 'TT', accessor: 'transitTime',
                render: (item) => <span className="text-slate-600 text-xs">{item.transitTime ? `${item.transitTime} d` : '—'}</span>
            },
            {
                header: 'Estado', accessor: 'status',
                render: (item) => {
                    const statusMap = {
                        PENDING:             { label: 'Pendiente',       color: 'bg-amber-50 text-amber-600 border-amber-200' },
                        AT_ORIGIN_WAREHOUSE: { label: 'En Almacén Origen', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                        AT_ORIGIN_PORT:      { label: 'En Puerto Origen', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
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
        ];
    }

    if (typeFilter === 'D2D') {
        return [
            ...common,
            { header: 'WH', accessor: 'whNumber', render: (i) => <span className="text-slate-600 text-xs">{i.whNumber || '—'}</span> },
            { header: 'BL', accessor: 'blNumber', render: (i) => <span className="text-slate-600 font-mono text-xs">{i.blNumber || '—'}</span> },
            { header: 'ETD', accessor: 'etd', render: (i) => <span className="text-slate-600 text-xs">{i.etd ? i.etd.split('T')[0] : '—'}</span> },
            { header: 'ETA', accessor: 'd2dEta', render: (i) => <span className="text-slate-600 text-xs">{i.d2dEta ? i.d2dEta.split('T')[0] : '—'}</span> },
            { header: 'CST', accessor: 'cst', render: (i) => <span className="text-slate-600 text-xs">{i.cst || '—'}</span> },
            { header: 'Consolidado', accessor: 'consolidadoManual', render: (i) => <span className="text-slate-600 text-xs">{i.consolidadoManual || '—'}</span> },
            {
                header: 'Transporte', accessor: 'transportType',
                render: (i) => <span className="text-slate-600 text-xs">{i.transportType === 'aereo' ? 'Aéreo' : (i.transportType === 'naviera' ? 'Naviera' : '—')}</span>
            },
            {
                header: 'Línea/Naviera', accessor: 'carrier',
                render: (i) => {
                    if (i.transportType === 'aereo') {
                        return <span className="text-slate-600 text-xs">{i.airLine?.name || '—'}</span>;
                    }
                    return <span className="text-slate-600 text-xs">{i.shippingLineRel?.name || i.shippingLine || '—'}</span>;
                }
            },
            {
                header: 'Items', accessor: 'd2dShipmentItems',
                render: (i) => <span className="text-slate-600 text-xs">{Array.isArray(i.d2dShipmentItems) ? `${i.d2dShipmentItems.length} items` : '0 items'}</span>
            },
            { header: 'Aliado', accessor: 'd2dAliado', render: (i) => <span className="text-slate-600 text-xs">{i.d2dAliado?.name || '—'}</span> },
            {
                header: 'TT', accessor: 'd2dTransitTime',
                render: (i) => <span className="text-slate-600 text-xs">{i.d2dTransitTime ? `${i.d2dTransitTime} d` : '—'}</span>
            },
            {
                header: 'Estado', accessor: 'status',
                render: (item) => {
                    const statusMap = {
                        PENDING:             { label: 'Pendiente',       color: 'bg-amber-50 text-amber-600 border-amber-200' },
                        AT_ORIGIN_WAREHOUSE: { label: 'En Almacén Origen', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                        AT_ORIGIN_PORT:      { label: 'En Puerto Origen', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
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
        ];
    }

    if (typeFilter === 'CONSOLIDADO') {
        return [
            ...common,
            { header: 'Nro. Consolidado', accessor: 'consolidadoNumber', render: (i) => <span className="text-slate-600 text-xs">{i.consolidadoNumber || '—'}</span> },
            { header: 'BL', accessor: 'blNumber', render: (i) => <span className="text-slate-600 font-mono text-xs">{i.blNumber || '—'}</span> },
            { header: 'ETA', accessor: 'eta', render: (i) => <span className="text-slate-600 text-xs">{i.eta ? i.eta.split('T')[0] : '—'}</span> },
            { header: 'ETD', accessor: 'etd', render: (i) => <span className="text-slate-600 text-xs">{i.etd ? i.etd.split('T')[0] : '—'}</span> },
            { header: 'Puerto Llegada', accessor: 'arrivalPort', render: (i) => <span className="text-slate-600 text-xs">{i.arrivalPort || '—'}</span> },
            { header: 'TT', accessor: 'consolidadoTransitTime', render: (i) => <span className="text-slate-600 text-xs">{i.consolidadoTransitTime ? `${i.consolidadoTransitTime} d` : '—'}</span> },
            {
                header: 'Estado', accessor: 'status',
                render: (item) => {
                    const statusMap = {
                        PENDING:             { label: 'Pendiente',       color: 'bg-amber-50 text-amber-600 border-amber-200' },
                        AT_ORIGIN_WAREHOUSE: { label: 'En Almacén Origen', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                        AT_ORIGIN_PORT:      { label: 'En Puerto Origen', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
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
        ];
    }

    // Sin filtro: columnas genéricas
    return [
        ...common,
        { header: 'BL', accessor: 'blNumber', render: (i) => <span className="text-slate-600 font-mono text-xs">{i.blNumber || '—'}</span> },
        {
            header: 'Ruta / Puerto', accessor: 'route',
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
            header: 'Estado', accessor: 'status',
            render: (item) => {
                const statusMap = {
                    PENDING:             { label: 'Pendiente',       color: 'bg-amber-50 text-amber-600 border-amber-200' },
                    AT_ORIGIN_WAREHOUSE: { label: 'En Almacén Origen', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                    AT_ORIGIN_PORT:      { label: 'En Puerto Origen', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
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
    ];
};
