import prisma from '../config/database.js';

export const getD2DItems = async (req, res) => {
	try {
		const { search = '', all = 'true' } = req.query;

		const where = search
			? { description: { contains: search, mode: 'insensitive' } }
			: {};

		if (all === 'true') {
			const items = await prisma.d2DItem.findMany({
				where,
				orderBy: { description: 'asc' }
			});
			return res.json({ data: items });
		}

		const items = await prisma.d2DItem.findMany({
			where,
			orderBy: { description: 'asc' }
		});

		res.json({ data: items });
	} catch (error) {
		console.error('Error in getD2DItems:', error);
		res.status(500).json({ message: 'Error al obtener items D2D' });
	}
};

export const createD2DItem = async (req, res) => {
	try {
		const { description } = req.body;

		const finalDescription = String(description || '').trim();
		if (!finalDescription) {
			return res.status(400).json({ message: 'La descripción es obligatoria' });
		}

		const existing = await prisma.d2DItem.findUnique({
			where: { description: finalDescription }
		});
		if (existing) {
			return res.status(400).json({ message: 'Ya existe un item con esa descripción' });
		}

		const created = await prisma.d2DItem.create({
			data: { description: finalDescription }
		});

		res.status(201).json(created);
	} catch (error) {
		console.error('Error in createD2DItem:', error);
		res.status(500).json({ message: 'Error al crear item D2D' });
	}
};
