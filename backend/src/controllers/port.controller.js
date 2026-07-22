import prisma from '../config/database.js';
import { getCurrentTenantId } from '../lib/tenantContext.js';

// Cache en memoria para catálogo de puertos (TTL 5 minutos)
const PORTS_CACHE_TTL = 5 * 60 * 1000;
const portsCache = new Map(); // key -> { data, expiresAt }
const makePortsKey = (params) => JSON.stringify({ tenantId: getCurrentTenantId(), ...params });
const getPortsCached = (key) => {
    const e = portsCache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { portsCache.delete(key); return null; }
    return e.data;
};
const setPortsCached = (key, data) => {
    portsCache.set(key, { data, expiresAt: Date.now() + PORTS_CACHE_TTL });
};
const clearPortsCache = () => {
    const tenantId = getCurrentTenantId();
    for (const key of portsCache.keys()) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.tenantId === tenantId) portsCache.delete(key);
        } catch { /* key invalida, ignorar */ }
    }
};

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const buildPortRateWhere = (port) => {
	const code = String(port?.code || '').trim();
	const name = String(port?.name || '').trim();

	const tokens = [code, name].filter(Boolean);
	return {
		OR: tokens.flatMap((token) => ([
			{ originPort: { equals: token } },
			{ destinationPort: { equals: token } },
			{ originPort: { contains: token, mode: 'insensitive' } },
			{ destinationPort: { contains: token, mode: 'insensitive' } }
		]))
	};
};

export const createPort = async (req, res) => {
	try {
		const { code, name } = req.body;

		const finalCode = normalizeCode(code);
		if (!finalCode) {
			return res.status(400).json({ message: 'El código es requerido' });
		}

		const existing = await prisma.port.findFirst({ 
			where: { code: { equals: finalCode, mode: 'insensitive' } }
		});
		if (existing) {
			return res.status(400).json({ message: 'Ya existe un puerto con ese código' });
		}

		const port = await prisma.port.create({
			data: {
				code: finalCode,
				name
			}
		});

		clearPortsCache();
		res.status(201).json(port);
	} catch (error) {
		console.error('Error creating port:', error);
		res.status(500).json({
			message: 'Error al crear puerto',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined
		});
	}
};

export const getPorts = async (req, res) => {
	try {
		const { page = 1, limit = 10, search = '', all = 'false', includeInactive = 'false' } = req.query;
		const skip = (parseInt(page) - 1) * parseInt(limit);
		const take = parseInt(limit);

		const where = {
			OR: [
				{ name: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } }
			]
		};

		if (includeInactive !== 'true') {
			where.isActive = true;
		}

		if (all === 'true') {
			const cacheKey = makePortsKey({ all: true, search, includeInactive: includeInactive === 'true' });
			const cachedAll = getPortsCached(cacheKey);
			if (cachedAll) return res.json({ data: cachedAll });

			const ports = await prisma.port.findMany({
				where,
				orderBy: { name: 'asc' }
			});

			const portsWithRatesCount = await Promise.all(
				ports.map(async (port) => {
					const ratesCount = await prisma.serviceRate.count({
						where: buildPortRateWhere(port)
					});
					return { ...port, ratesCount };
				})
			);

			setPortsCached(cacheKey, portsWithRatesCount);
			return res.json({ data: portsWithRatesCount });
		}

		const listCacheKey = makePortsKey({ all: false, search, includeInactive: includeInactive === 'true', page: parseInt(page), limit: take });
		const cachedList = getPortsCached(listCacheKey);
		if (cachedList) return res.json(cachedList);

		const total = await prisma.port.count({ where });
		const ports = await prisma.port.findMany({
			where,
			skip,
			take,
			orderBy: { name: 'asc' }
		});

		const portsWithRatesCount = await Promise.all(
			ports.map(async (port) => {
				const ratesCount = await prisma.serviceRate.count({
					where: buildPortRateWhere(port)
				});
				return { ...port, ratesCount };
			})
		);

		const payload = {
			data: portsWithRatesCount,
			meta: {
				total,
				page: parseInt(page),
				last_page: Math.ceil(total / take)
			}
		};
		setPortsCached(listCacheKey, payload);
		res.json(payload);
	} catch (error) {
		console.error('Error getting ports:', error);
		res.status(500).json({ message: 'Error al obtener puertos' });
	}
};

export const getPort = async (req, res) => {
	try {
		const { id } = req.params;
		const port = await prisma.port.findFirst({ where: { id } });

		if (!port) {
			return res.status(404).json({ message: 'Puerto no encontrado' });
		}

		const rates = await prisma.serviceRate.findMany({
			where: buildPortRateWhere(port),
			include: {
				service: { select: { id: true, name: true, code: true, type: true } },
				ally: { select: { id: true, name: true } },
				zone: { select: { id: true, name: true, internalCode: true } }
			},
			orderBy: { updatedAt: 'desc' }
		});

		const formattedRates = rates.map(rate => ({
			...rate,
			costPrice: parseFloat(rate.costPrice),
			salePrice: parseFloat(rate.salePrice)
		}));

		res.json({
			...port,
			rates: formattedRates
		});
	} catch (error) {
		console.error('Error getting port:', error);
		res.status(500).json({ message: 'Error al obtener puerto' });
	}
};

export const updatePort = async (req, res) => {
	try {
		const { id } = req.params;
		const { code, name } = req.body;

		const existingPort = await prisma.port.findFirst({ where: { id } });
		if (!existingPort) {
			return res.status(404).json({ message: 'Puerto no encontrado' });
		}

		const finalCode = normalizeCode(code);
		if (!finalCode) {
			return res.status(400).json({ message: 'El código es requerido' });
		}

		if (finalCode !== existingPort.code) {
			const existing = await prisma.port.findFirst({ 
				where: { code: { equals: finalCode, mode: 'insensitive' } }
			});
			if (existing) {
				return res.status(400).json({ message: 'Ya existe un puerto con ese código' });
			}
		}

		const updatedPort = await prisma.port.update({
			where: { id },
			data: {
				code: finalCode,
				name
			}
		});

		clearPortsCache();
		res.json(updatedPort);
	} catch (error) {
		console.error('Error updating port:', error);
		res.status(500).json({ message: 'Error al actualizar puerto' });
	}
};

export const deletePort = async (req, res) => {
	try {
		const { id } = req.params;

		const port = await prisma.port.findFirst({ where: { id } });
		if (!port) {
			return res.status(404).json({ message: 'Puerto no encontrado' });
		}

		await prisma.port.update({
			where: { id },
			data: { isActive: false }
		});

		clearPortsCache();
		res.json({ message: 'Puerto desactivado correctamente' });
	} catch (error) {
		console.error('Error deleting port:', error);
		res.status(500).json({ message: 'Error al eliminar puerto' });
	}
};

export const togglePortStatus = async (req, res) => {
	try {
		const { id } = req.params;

		const port = await prisma.port.findFirst({ where: { id } });
		if (!port) {
			return res.status(404).json({ message: 'Puerto no encontrado' });
		}

		const updatedPort = await prisma.port.update({
			where: { id },
			data: { isActive: !port.isActive }
		});

		clearPortsCache();
		res.json(updatedPort);
	} catch (error) {
		console.error('Error toggling port status:', error);
		res.status(500).json({ message: 'Error al cambiar estado del puerto' });
	}
};
