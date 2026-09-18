import { formatCurrency } from '../utils/currency';

const PAYABLE_STATUS_MAP = {
    PENDING:        { label: 'Pendiente',  color: 'bg-amber-50 text-amber-600 border-amber-200' },
    PARTIALLY_PAID: { label: 'Abonada',   color: 'bg-blue-50 text-blue-600 border-blue-200' },
    PAID:           { label: 'Pagada',    color: 'bg-green-50 text-green-600 border-green-200' },
};

const getCurrency = (item) => item.currency || 'USD';

export const payableConfig = {
    entityName: 'cuenta por pagar',
    entityNamePlural: 'cuentas por pagar',

    columns: [
        {
            header: 'Cuenta',
            accessor: 'number',
            render: (item) => (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-red-50 text-red-600 border-red-200">
                    CXP-{String(item.number || 0).padStart(5, '0')}
                </span>
            )
        },
        {
            header: 'Nro.Factura',
            accessor: 'invoiceNr',
            render: (item) => (
                <span className="text-sm text-slate-700">
                    {item.invoiceNr?.trim() ? item.invoiceNr : '-'}
                </span>
            )
        },
        {
            header: 'Beneficiario',
            accessor: 'ally',
            render: (item) => {
                const name = item.ally?.name || item.svcProvider?.name || item.employeeUser?.name || 'N/A';
                let subLabel = '';
                if (item.ally) subLabel = 'Aliado';
                else if (item.svcProvider) subLabel = 'Proveedor';
                else if (item.employeeUser) {
                    subLabel = item.employeeUser.position
                        ? `Empleado · ${item.employeeUser.position}`
                        : `Empleado · ${item.employeeUser.memberships?.[0]?.role === 'ADMIN' ? 'Administrador' : 'Ventas'}`;
                }
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{name}</span>
                        {subLabel && <span className="text-xs text-slate-400">{subLabel}</span>}
                    </div>
                );
            }
        },
        {
            header: 'Descripción',
            accessor: 'description',
            render: (item) => (
                <span className="text-slate-600 text-sm max-w-[200px] truncate block" title={item.description}>
                    {item.description}
                </span>
            )
        },
        {
            header: 'Total',
            accessor: 'amount',
            render: (item) => (
                <span className="text-slate-700">
                    {formatCurrency(item.amount, getCurrency(item))}
                </span>
            )
        },
        {
            header: 'Abonado',
            accessor: 'paidAmount',
            render: (item) => (
                <span className="font-medium text-green-600">
                    {formatCurrency(item.paidAmount, getCurrency(item))}
                </span>
            )
        },
        {
            header: 'Pendiente',
            accessor: 'balance',
            render: (item) => {
                const pending = parseFloat(item.amount) - parseFloat(item.paidAmount || 0);
                return (
                    <span className="font-bold text-amber-600">
                        {formatCurrency(pending, getCurrency(item))}
                    </span>
                );
            }
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (item) => {
                const cfg = PAYABLE_STATUS_MAP[item.status] || PAYABLE_STATUS_MAP.PENDING;
                return (
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${cfg.color}`}>
                        {cfg.label}
                    </span>
                );
            }
        },
    ]
};
