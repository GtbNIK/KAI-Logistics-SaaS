import prisma from '../config/database.js';

// Cache con TTL para catálogos que cambian raramente
const AIRLINES_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
let AIRLINES_CACHE = { data: null, timestamp: 0 };

export const getAirLines = async (req, res) => {
    try {
        const { search = '', all, includeInactive } = req.query;
        const now = Date.now();

        // Devolver cache si no hay búsqueda ni banderas y el cache está fresco
        if (!search && !all && includeInactive !== 'true' && AIRLINES_CACHE.data && (now - AIRLINES_CACHE.timestamp < AIRLINES_CACHE_TTL)) {
            return res.json({ data: AIRLINES_CACHE.data });
        }
        const where = (all || includeInactive === 'true') ? {} : { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        const lines = await prisma.airLine.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        // Actualizar cache solo si no hay filtros/banderas
        if (!search && !all && includeInactive !== 'true') {
            AIRLINES_CACHE = { data: lines, timestamp: now };
        }
        res.json({ data: lines });
    } catch (error) {
        console.error('Error getAirLines:', error);
        res.status(500).json({ message: 'Error al obtener líneas aéreas' });
    }
};

export const createAirLine = async (req, res) => {
    try {
        const { name, code } = req.body;
        const finalName = String(name || '').trim();
        if (!finalName) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }
        const existing = await prisma.airLine.findFirst({ where: { name: finalName } });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una línea aérea con ese nombre' });
        }
        const line = await prisma.airLine.create({
            data: { name: finalName, code: code?.trim() || null }
        });
        res.status(201).json(line);
    } catch (error) {
        console.error('Error createAirLine:', error);
        res.status(500).json({ message: 'Error al crear línea aérea' });
    }
};

export const updateAirLine = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, isActive } = req.body;
        const line = await prisma.airLine.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: String(name).trim() }),
                ...(code !== undefined && { code: code?.trim() || null }),
                ...(isActive !== undefined && { isActive }),
            }
        });
        res.json(line);
    } catch (error) {
        console.error('Error updateAirLine:', error);
        res.status(500).json({ message: 'Error al actualizar línea aérea' });
    }
};

export const toggleAirLineStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const line = await prisma.airLine.findUnique({ where: { id } });
        if (!line) return res.status(404).json({ message: 'Línea aérea no encontrada' });
        const updated = await prisma.airLine.update({
            where: { id },
            data: { isActive: !line.isActive }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error toggleAirLineStatus:', error);
        res.status(500).json({ message: 'Error al cambiar estado de línea aérea' });
    }
};

export const deleteAirLine = async (req, res) => {
    try {
        await prisma.airLine.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        res.json({ message: 'Línea aérea desactivada' });
    } catch (error) {
        console.error('Error deleteAirLine:', error);
        res.status(500).json({ message: 'Error al eliminar línea aérea' });
    }
};
