import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Crear servicio
export const createService = async (req, res) => {
    try {
        const { code, name, type, notes } = req.body;

        // Verificar código único
        const existingService = await prisma.service.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (existingService) {
            return res.status(400).json({ 
                message: 'Ya existe un servicio con ese código' 
            });
        }

        const service = await prisma.service.create({
            data: {
                code: code.toUpperCase(),
                name,
                type,
                notes
            }
        });

        res.status(201).json(service);
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ 
            message: 'Error al crear servicio',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los servicios
export const getServices = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', all = 'false', type, includeInactive = 'false' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Filtro de búsqueda
        const where = {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
            ]
        };

        // Filtrar por estado activo
        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        // Filtrar por tipo si se especifica
        if (type && type !== 'all') {
            where.type = type;
        }

        // Si all=true, devolver sin paginación
        if (all === 'true') {
            const services = await prisma.service.findMany({
                where,
                orderBy: { name: 'asc' }
            });
            return res.json({ data: services });
        }

        // Conteo total para paginación
        const total = await prisma.service.count({ where });

        const services = await prisma.service.findMany({
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
            data: services,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error getting services:', error);
        res.status(500).json({ message: 'Error al obtener servicios' });
    }
};

// Obtener un servicio por ID
export const getService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await prisma.service.findUnique({
            where: { id },
            include: {
                rates: {
                    include: {
                        ally: { select: { id: true, name: true } },
                        zone: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!service) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        res.json(service);
    } catch (error) {
        console.error('Error getting service:', error);
        res.status(500).json({ message: 'Error al obtener servicio' });
    }
};

// Actualizar servicio
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, type, notes } = req.body;

        const existingService = await prisma.service.findUnique({ where: { id } });
        if (!existingService) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        // Verificar código único si cambió
        if (code && code.toUpperCase() !== existingService.code) {
            const duplicate = await prisma.service.findUnique({
                where: { code: code.toUpperCase() }
            });
            if (duplicate) {
                return res.status(400).json({ 
                    message: 'Ya existe otro servicio con ese código' 
                });
            }
        }

        const updatedService = await prisma.service.update({
            where: { id },
            data: {
                code: code ? code.toUpperCase() : existingService.code,
                name,
                type,
                notes
            }
        });

        res.json(updatedService);
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ message: 'Error al actualizar servicio' });
    }
};

// Eliminar servicio (Soft Delete)
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await prisma.service.findUnique({ where: { id } });
        if (!service) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        // Soft delete: marcar como inactivo
        await prisma.service.update({
            where: { id },
            data: { isActive: false }
        });

        res.json({ message: 'Servicio desactivado correctamente' });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ message: 'Error al eliminar servicio' });
    }
};

// Toggle estado del servicio
export const toggleServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await prisma.service.findUnique({ where: { id } });
        if (!service) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        const updatedService = await prisma.service.update({
            where: { id },
            data: { isActive: !service.isActive }
        });

        res.json(updatedService);
    } catch (error) {
        console.error('Error toggling service status:', error);
        res.status(500).json({ message: 'Error al cambiar estado del servicio' });
    }
};

// Obtener tipos de servicio (para dropdown)
export const getServiceTypes = async (req, res) => {
    try {
        // Los tipos están definidos en el enum de Prisma
        const types = [
            { value: 'DOOR_TO_DOOR', label: 'Puerta a Puerta' },
            { value: 'FCL_20', label: 'Contenedor 20\'' },
            { value: 'FCL_40', label: 'Contenedor 40\'' },
            { value: 'FCL_40HC', label: 'Contenedor 40\' HC' },
            { value: 'LCL', label: 'Carga Suelta (LCL)' },
            { value: 'AIR', label: 'Aéreo' },
            { value: 'WAREHOUSE', label: 'Almacenaje' },
            { value: 'CUSTOMS', label: 'Aduana' },
            { value: 'OTHER', label: 'Otro' }
        ];
        res.json(types);
    } catch (error) {
        console.error('Error getting service types:', error);
        res.status(500).json({ message: 'Error al obtener tipos de servicio' });
    }
};
