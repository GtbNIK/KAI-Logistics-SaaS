import prisma from '../config/database.js';
import { getCurrentTenantId } from '../lib/tenantContext.js';

// Cache con TTL para items D2D (catálogo estable)
const D2D_ITEMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const d2dItemsCache = new Map(); // key -> { data, expiresAt }

const makeD2dItemsKey = (params) => JSON.stringify({ tenantId: getCurrentTenantId(), ...params });
const getD2dItemsCached = (key) => {
    const e = d2dItemsCache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { d2dItemsCache.delete(key); return null; }
    return e.data;
};
const setD2dItemsCached = (key, data) => {
    d2dItemsCache.set(key, { data, expiresAt: Date.now() + D2D_ITEMS_CACHE_TTL });
};
const clearD2dItemsCache = () => {
    const tenantId = getCurrentTenantId();
    for (const key of d2dItemsCache.keys()) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.tenantId === tenantId) d2dItemsCache.delete(key);
        } catch { /* key invalida, ignorar */ }
    }
};

export const getD2DItems = async (req, res) => {
	try {
		const { search = '', all = 'true' } = req.query;
		const now = Date.now();

		// Devolver cache si no hay búsqueda y el cache está fresco
		const cacheKey = makeD2dItemsKey({ search });
		if (!search) {
			const cached = getD2dItemsCached(cacheKey);
			if (cached) return res.json({ data: cached });
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
			setD2dItemsCached(cacheKey, items);
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

		const existing = await prisma.d2DItem.findFirst({
			where: { description: finalDescription }
		});
		if (existing) {
			return res.status(400).json({ message: 'Ya existe un item con esa descripción' });
		}

		const created = await prisma.d2DItem.create({
			data: { description: finalDescription }
		});

		// Invalidar caché para que el nuevo item sea visible de inmediato
		clearD2dItemsCache();

		res.status(201).json(created);
	} catch (error) {
		console.error('Error in createD2DItem:', error);
		res.status(500).json({ message: 'Error al crear item D2D' });
	}
};
