import prisma from '../config/database.js';

// Cache con TTL para items D2D (catálogo estable)
const D2D_ITEMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
let D2D_ITEMS_CACHE = { data: null, timestamp: 0 };

export const getD2DItems = async (req, res) => {
	try {
		const { search = '', all = 'true' } = req.query;
		const now = Date.now();

		// Devolver cache si no hay búsqueda y el cache está fresco
		if (!search && D2D_ITEMS_CACHE.data && (now - D2D_ITEMS_CACHE.timestamp < D2D_ITEMS_CACHE_TTL)) {
			return res.json({ data: D2D_ITEMS_CACHE.data });
		}

		const where = search
			? { description: { contains: search, mode: 'insensitive' } }
			: {};

		const items = await prisma.d2DItem.findMany({
			where,
			orderBy: { description: 'asc' }
		});

		// Actualizar cache solo si no hay búsqueda
		if (!search) {
			D2D_ITEMS_CACHE = { data: items, timestamp: now };
		}

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

		// Invalidar caché para que el nuevo item sea visible de inmediato
		D2D_ITEMS_CACHE = { data: null, timestamp: 0 };

		res.status(201).json(created);
	} catch (error) {
		console.error('Error in createD2DItem:', error);
		res.status(500).json({ message: 'Error al crear item D2D' });
	}
};
