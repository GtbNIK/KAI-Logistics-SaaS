import { Plane, Hash } from 'lucide-react';

export const airLineConfig = {
    entityName: 'línea aérea',
    entityNamePlural: 'líneas aéreas',
    codeColor: 'blue',

    columns: [
        {
            header: 'Código IATA',
            accessor: 'code',
            render: (item, colorClass) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
                    {item.code || '—'}
                </span>
            )
        },
        {
            header: 'Aerolínea',
            accessor: 'name',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <Plane size={16} className="text-sky-500" />
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
            title: 'Información de la Aerolínea',
            icon: Plane,
            columns: 1,
            fields: [
                {
                    name: 'code',
                    label: 'Código IATA',
                    type: 'text',
                    required: false,
                    placeholder: 'Ej. AA / DL / LA / AM',
                    icon: Hash
                },
                {
                    name: 'name',
                    label: 'Nombre de la Aerolínea',
                    type: 'text',
                    required: true,
                    placeholder: 'Ej. American Airlines',
                    icon: Plane
                }
            ]
        }
    ]
};

export default airLineConfig;
