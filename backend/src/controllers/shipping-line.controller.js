import prisma from '../config/database.js';

export const getShippingLines = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const where = { isActive: true };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        const lines = await prisma.shippingLine.findMany({
            where,
            orderBy: { name: 'asc' }
        });
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
        const existing = await prisma.shippingLine.findUnique({ where: { name: finalName } });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe una línea con ese nombre' });
        }
        const line = await prisma.shippingLine.create({
            data: { name: finalName, code: code?.trim() || null }
        });
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
        res.json(line);
    } catch (error) {
        console.error('Error updateShippingLine:', error);
        res.status(500).json({ message: 'Error al actualizar línea naviera' });
    }
};

export const deleteShippingLine = async (req, res) => {
    try {
        await prisma.shippingLine.update({
            where: { id: req.params.id },
            data: { isActive: false }
        });
        res.json({ message: 'Línea naviera desactivada' });
    } catch (error) {
        console.error('Error deleteShippingLine:', error);
        res.status(500).json({ message: 'Error al eliminar línea naviera' });
    }
};
