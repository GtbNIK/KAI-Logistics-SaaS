import { Anchor, Hash } from 'lucide-react';

export const portConfig = {
	entityName: 'puerto',
	entityNamePlural: 'puertos',
	codeColor: 'blue',

	columns: [
		{
			header: 'Código',
			accessor: 'code',
			render: (item, colorClass) => (
				<span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${colorClass}`}>
					{item.code}
				</span>
			)
		},
		{
			header: 'Puerto',
			accessor: 'name',
			render: (item) => (
				<div className="flex items-center gap-2">
					<Anchor size={16} className="text-blue-500" />
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
					{item.isActive ? 'Activo' : 'Inactivo'}
				</span>
			)
		}
	],

	formSections: [
		{
			title: 'Información del Puerto',
			icon: Anchor,
			columns: 1,
			fields: [
				{
					name: 'code',
					label: 'Código',
					type: 'text',
					required: true,
					placeholder: 'Ej. MIA / LAG / CCS',
					icon: Hash
				},
				{
					name: 'name',
					label: 'Nombre del Puerto',
					type: 'text',
					required: true,
					placeholder: 'Ej. Miami',
					icon: Anchor
				}
			]
		}
	]
};

export default portConfig;
