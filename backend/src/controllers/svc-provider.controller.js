import prisma from '../config/database.js';

export const getSvcProviders = async (req, res) => {
	try {
		const { search = '', all = 'true' } = req.query;

		const where = search
			? { name: { contains: search, mode: 'insensitive' } }
			: {};

		if (all === 'true') {
			const providers = await prisma.svcProvider.findMany({
				where,
				orderBy: { name: 'asc' }
			});
			return res.json({ data: providers });
		}

		const providers = await prisma.svcProvider.findMany({
			where,
			orderBy: { name: 'asc' }
		});

		res.json({ data: providers });
	} catch (error) {
		console.error('Error in getSvcProviders:', error);
		res.status(500).json({ message: 'Error al obtener proveedores de servicio' });
	}
};

export const createSvcProvider = async (req, res) => {
	try {
		const { name } = req.body;

		const finalName = String(name || '').trim();
		if (!finalName) {
			return res.status(400).json({ message: 'El nombre es obligatorio' });
		}

		const existing = await prisma.svcProvider.findFirst({
			where: { name: finalName }
		});
		if (existing) {
			return res.status(400).json({ message: 'Ya existe un proveedor con ese nombre' });
		}

		const created = await prisma.svcProvider.create({
			data: { name: finalName }
		});

		res.status(201).json(created);
	} catch (error) {
		console.error('Error in createSvcProvider:', error);
		res.status(500).json({ message: 'Error al crear proveedor de servicio' });
	}
};
