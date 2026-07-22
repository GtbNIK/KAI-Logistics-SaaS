import prisma from '../config/database.js';
import { getCurrentTenantId } from '../lib/tenantContext.js';

// Cache simple en memoria para catálogos (TTL en ms)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const shippingLinesCache = new Map(); // key -> { data, expiresAt }

const makeKey = (params) => JSON.stringify({ tenantId: getCurrentTenantId(), ...params });
const getCached = (key) => {
    const entry = shippingLinesCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        shippingLinesCache.delete(key);
        return null;
    }
    return entry.data;
};
const setCached = (key, data) => {
    shippingLinesCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
};
const clearCatalogCache = () => {
    const tenantId = getCurrentTenantId();
    for (const key of shippingLinesCache.keys()) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.tenantId === tenantId) shippingLinesCache.delete(key);
        } catch { /* key invalida, ignorar */ }
    }
};

export const getShippingLines = async (req, res) => {
    try {
        const { search = '', includeInactive } = req.query;
        const where = includeInactive === 'true' ? {} : { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        const cacheKey = makeKey({ search, includeInactive: includeInactive === 'true' });
        const cached = getCached(cacheKey);
        if (cached) return res.json({ data: cached });

        const lines = await prisma.shippingLine.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        setCached(cacheKey, lines);
        res.json({ data: lines });
    } catch (error) {
        console.error('Error getShippingLines:', error);
        res.status(500).json({ message: 'Error al obtener líneas navieras' });
    }
};

export const createShippingLine = async (req, res) => {
    try {
        const { name, code } = req.body;
        const finalName = String(name || '').trim();
        if (!finalName) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }
        const existing = await prisma.shippingLine.findFirst({ where: { name: finalName } });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una línea con ese nombre' });
        }
        const line = await prisma.shippingLine.create({
            data: { name: finalName, code: code?.trim() || null }
        });
        clearCatalogCache();
        res.status(201).json(line);
    } catch (error) {
        console.error('Error createShippingLine:', error);
        res.status(500).json({ message: 'Error al crear línea naviera' });
    }
};

export const updateShippingLine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, isActive } = req.body;
        const line = await prisma.shippingLine.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: String(name).trim() }),
                ...(code !== undefined && { code: code?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            }
        });
        clearCatalogCache();
        res.json(line);
    } catch (error) {
        console.error('Error updateShippingLine:', error);
        res.status(500).json({ message: 'Error al actualizar línea naviera' });
    }
};

export const toggleShippingLineStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const line = await prisma.shippingLine.findFirst({ where: { id } });
        if (!line) return res.status(404).json({ message: 'Línea naviera no encontrada' });
        const updated = await prisma.shippingLine.update({
            where: { id },
            data: { isActive: !line.isActive }
        });
        clearCatalogCache();
        res.json(updated);
    } catch (error) {
        console.error('Error toggleShippingLineStatus:', error);
        res.status(500).json({ message: 'Error al cambiar estado de línea naviera' });
    }
};

export const deleteShippingLine = async (req, res) => {
    try {
        await prisma.shippingLine.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        clearCatalogCache();
        res.json({ message: 'Línea naviera desactivada' });
    } catch (error) {
        console.error('Error deleteShippingLine:', error);
        res.status(500).json({ message: 'Error al eliminar línea naviera' });
    }
};
