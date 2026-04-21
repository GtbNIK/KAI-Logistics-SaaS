import prisma from '../config/database.js';

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
            const existing = await prisma.zone.findUnique({
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
            const zones = await prisma.zone.findMany({
                where,
                orderBy: { name: 'asc' }
            });
            return res.json({ data: zones });
        }

        // Conteo total para paginación
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

        res.json({
            data: zones,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error getting zones:', error);
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};

// Obtener una zona por ID
export const getZone = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await prisma.zone.findUnique({
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

        const existingZone = await prisma.zone.findUnique({ where: { id } });
        if (!existingZone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        const updatedZone = await prisma.zone.update({
            where: { id },
            data: { name, description }
        });

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

        const zone = await prisma.zone.findUnique({ where: { id } });
        if (!zone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        // Soft delete: marcar como inactivo
        await prisma.zone.update({
            where: { id },
            data: { isActive: false }
        });

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

        const zone = await prisma.zone.findUnique({ where: { id } });
        if (!zone) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        const updatedZone = await prisma.zone.update({
            where: { id },
            data: { isActive: !zone.isActive }
        });

        res.json(updatedZone);
    } catch (error) {
        console.error('Error toggling zone status:', error);
        res.status(500).json({ message: 'Error al cambiar estado de la zona' });
    }
};
