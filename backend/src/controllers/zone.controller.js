import prisma from '../config/database.js';
import { getCurrentTenantId } from '../lib/tenantContext.js';

// Cache en memoria para catálogo de zonas (TTL 5 minutos)
const ZONES_CACHE_TTL = 5 * 60 * 1000;
const zonesCache = new Map(); // key -> { data, expiresAt }
const makeZonesKey = (params) => JSON.stringify({ tenantId: getCurrentTenantId(), ...params });
const getZonesCached = (key) => {
    const e = zonesCache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { zonesCache.delete(key); return null; }
    return e.data;
};
const setZonesCached = (key, data) => {
    zonesCache.set(key, { data, expiresAt: Date.now() + ZONES_CACHE_TTL });
};
const clearZonesCache = () => {
    const tenantId = getCurrentTenantId();
    for (const key of zonesCache.keys()) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.tenantId === tenantId) zonesCache.delete(key);
        } catch { /* key invalida, ignorar */ }
    }
};

// Generar código interno automático
const generateInternalCode = async () => {
    const lastZone = await prisma.zone.findFirst({
        orderBy: { internalCode: 'desc' }
    });
    
    if (!lastZone) return 'ZON-0001';
    
    const match = lastZone.internalCode.match(/ZON-(\d+)/);
    if (!match) return 'ZON-0001';
    
    const nextNum = parseInt(match[1]) + 1;
    return `ZON-${nextNum.toString().padStart(4, '0')}`;
};

// Crear zona
export const createZone = async (req, res) => {
    try {
        const { internalCode, name, description } = req.body;

        // Usar código del usuario o generar automáticamente
        let finalCode = internalCode?.trim();
        
        if (!finalCode) {
            finalCode = await generateInternalCode();
        } else {
            // Verificar que el código no esté duplicado
            const existing = await prisma.zone.findFirst({
                where: { internalCode: finalCode.toUpperCase() }
            });
            if (existing) {
                return res.status(400).json({ 
                    message: 'Ya existe una zona con ese código interno' 
                });
            }
            finalCode = finalCode.toUpperCase();
        }

        const zone = await prisma.zone.create({
            data: {
                internalCode: finalCode,
                name,
                description
            }
        });

        clearZonesCache();
        res.status(201).json(zone);
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({ 
            message: 'Error al crear zona',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todas las zonas
export const getZones = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', all = 'false', includeInactive = 'false' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Filtro de búsqueda
        const where = {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ]
        };

        // Filtrar por estado activo
        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        // Si all=true, devolver sin paginación
        if (all === 'true') {
            const cacheKey = makeZonesKey({ all: true, search, includeInactive: includeInactive === 'true' });
            const cachedAll = getZonesCached(cacheKey);
            if (cachedAll) return res.json({ data: cachedAll });

            const zones = await prisma.zone.findMany({
                where,
                orderBy: { name: 'asc' }
            });
            setZonesCached(cacheKey, zones);
            return res.json({ data: zones });
        }

        // Conteo total para paginación
        const listCacheKey = makeZonesKey({ all: false, search, includeInactive: includeInactive === 'true', page: parseInt(page), limit: take });
        const cachedList = getZonesCached(listCacheKey);
        if (cachedList) return res.json(cachedList);

        const total = await prisma.zone.count({ where });

        const zones = await prisma.zone.findMany({
            where,
            skip,
            take,
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { rates: true }
                }
            }
        });

        const payload = {
            data: zones,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        };
        setZonesCached(listCacheKey, payload);
        res.json(payload);
    } catch (error) {
        console.error('Error getting zones:', error);
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};

// Obtener una zona por ID
export const getZone = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await prisma.zone.findFirst({
            where: { id },
            include: {
                rates: {
                    include: {
                        ally: { select: { id: true, name: true } },
                        service: { select: { id: true, name: true, code: true } }
                    }
                }
            }
        });

        if (!zone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        res.json(zone);
    } catch (error) {
        console.error('Error getting zone:', error);
        res.status(500).json({ message: 'Error al obtener zona' });
    }
};

// Actualizar zona
export const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const existingZone = await prisma.zone.findFirst({ where: { id } });
        if (!existingZone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        const updatedZone = await prisma.zone.update({
            where: { id },
            data: { name, description }
        });

        clearZonesCache();
        res.json(updatedZone);
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({ message: 'Error al actualizar zona' });
    }
};

// Eliminar zona (Soft Delete)
export const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await prisma.zone.findFirst({ where: { id } });
        if (!zone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        // Soft delete: marcar como inactivo
        await prisma.zone.update({
            where: { id },
            data: { isActive: false }
        });

        clearZonesCache();
        res.json({ message: 'Zona desactivada correctamente' });
    } catch (error) {
        console.error('Error deleting zone:', error);
        res.status(500).json({ message: 'Error al eliminar zona' });
    }
};

// Toggle estado de la zona
export const toggleZoneStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await prisma.zone.findFirst({ where: { id } });
        if (!zone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        const updatedZone = await prisma.zone.update({
            where: { id },
            data: { isActive: !zone.isActive }
        });

        clearZonesCache();
        res.json(updatedZone);
    } catch (error) {
        console.error('Error toggling zone status:', error);
        res.status(500).json({ message: 'Error al cambiar estado de la zona' });
    }
};
