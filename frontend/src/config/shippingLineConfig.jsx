import { Ship, Hash } from 'lucide-react';

export const shippingLineConfig = {
    entityName: 'naviera',
    entityNamePlural: 'navieras',
    codeColor: 'purple',

    columns: [
        {
            header: 'Código',
            accessor: 'code',
            render: (item, colorClass) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
                    {item.code || '—'}
                </span>
            )
        },
        {
            header: 'Naviera',
            accessor: 'name',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <Ship size={16} className="text-indigo-500" />
                    <span className="font-semibold text-slate-800">{item.name}</span>
                </div>
            )
        },
        {
            header: 'Estado',
            accessor: 'isActive',
            align: 'center',
            render: (item) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    item.isActive
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                    {item.isActive ? 'Activa' : 'Inactiva'}
                </span>
            )
        }
    ],

    formSections: [
        {
            title: 'Información de la Naviera',
            icon: Ship,
            columns: 1,
            fields: [
                {
                    name: 'code',
                    label: 'Código',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. MSC / CMA / HMM',
                    icon: Hash
                },
                {
                    name: 'name',
                    label: 'Nombre de la Naviera',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. Mediterranean Shipping Company',
                    icon: Ship
                }
            ]
        }
    ]
};

export default shippingLineConfig;
