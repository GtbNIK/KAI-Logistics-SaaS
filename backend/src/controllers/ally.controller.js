import { PrismaClient } from '@prisma/client';

// Usar global.prisma si ya existe para evitar múltiples conexiones en dev
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Normalizar RIF/Cédula: eliminar guiones, espacios y convertir a mayúsculas
const normalizeRifOrId = (rifOrId) => {
    if (!rifOrId) return '';
    return rifOrId.replace(/[-\s]/g, '').toUpperCase().trim();
};

// Generar código interno automático (ej. ALL-0001)
const generateInternalCode = async () => {
    // Obtener TODOS los códigos existentes
    const allAllies = await prisma.ally.findMany({
        select: { internalCode: true }
    });
    
    if (!allAllies || allAllies.length === 0) return 'ALL-0001';
    
    // Extraer los números de todos los códigos y encontrar el máximo
    const numbers = allAllies
        .map(ally => {
            const match = ally.internalCode.match(/ALL-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        })
        .filter(num => !isNaN(num));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `ALL-${nextNumber.toString().padStart(4, '0')}`;
};

export const createAlly = async (req, res) => {
    try {
        const { name, rifOrId, contactInfo, address, internalCode: providedInternalCode } = req.body;
        
        // Normalizar RIF/Cédula (si se proporciona)
        const normalizedRifOrId = rifOrId ? normalizeRifOrId(rifOrId) : null;
        
        // Verificar duplicados de RIF/Cédula solo si se proporciona
        if (normalizedRifOrId) {
            const existingAlly = await prisma.ally.findFirst({
                where: { 
                    rifOrId: normalizedRifOrId
                }
            });

            if (existingAlly) {
                return res.status(400).json({ 
                    message: 'Ya existe un aliado con ese RIF/Cédula' 
                });
            }
        }

        // Usar código proporcionado o generar automáticamente
        const internalCode = providedInternalCode || await generateInternalCode();

        // Verificar duplicados de código interno si se proporcionó manualmente
        if (providedInternalCode) {
            const existingCode = await prisma.ally.findFirst({
                where: { internalCode }
            });

            if (existingCode) {
                return res.status(400).json({ 
                    message: 'Ya existe un aliado con ese código interno' 
                });
            }
        }

        const ally = await prisma.ally.create({
            data: {
                internalCode,
                name,
                rifOrId: normalizedRifOrId,
                contactInfo: contactInfo || null,
                address: address || null
            }
        });

        res.status(201).json(ally);
    } catch (error) {
        console.error('Error creating ally:', error);
        
        // Errores específicos de Prisma
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0];
            let fieldName = 'datos';
            if (field === 'internalCode') fieldName = 'código interno';
            
            return res.status(400).json({ 
                message: `Ya existe un aliado con ese ${fieldName}` 
            });
        }
        
        res.status(500).json({ 
            message: 'Error al crear aliado',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const getAllies = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', all = 'false', includeInactive = 'false' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Filtro de búsqueda
        const where = {
            deletedAt: null, // Excluir eliminados (soft delete)
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { contactInfo: { contains: search, mode: 'insensitive' } }
            ]
        };

        // Filtrar por activos/inactivos
        if (includeInactive !== 'true') {
            where.isActive = true;
        }

        // Si all=true, devolver sin paginación (para selects)
        if (all === 'true') {
             const allies = await prisma.ally.findMany({
                where,
                orderBy: { name: 'asc' }
            });
            return res.json({ data: allies });
        }

        // Conteo total para paginación
        const total = await prisma.ally.count({ where });

        const allies = await prisma.ally.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            data: allies,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error getting allies:', error);
        res.status(500).json({ message: 'Error al obtener aliados' });
    }
};

export const getAlly = async (req, res) => {
    try {
        const { id } = req.params;
        const ally = await prisma.ally.findUnique({
            where: { id }
        });

        if (!ally) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }

        res.json(ally);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener aliado' });
    }
};

export const updateAlly = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rifOrId, contactInfo, address } = req.body;

        // Normalizar RIF/Cédula (si se proporciona)
        const normalizedRifOrId = rifOrId ? normalizeRifOrId(rifOrId) : null;

        const existingAlly = await prisma.ally.findUnique({ where: { id } });
        if (!existingAlly) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }

        // Verificar duplicados SOLO si el RIF cambió y no es null/vacío
        const rifChanged = normalizedRifOrId !== existingAlly.rifOrId;

        if (rifChanged && normalizedRifOrId) {
            const duplicate = await prisma.ally.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        { rifOrId: normalizedRifOrId }
                    ]
                }
            });

            if (duplicate) {
                return res.status(400).json({ 
                    message: 'Ya existe otro aliado con ese RIF/Cédula' 
                });
            }
        }

        const updatedAlly = await prisma.ally.update({
            where: { id },
            data: {
                name, 
                rifOrId: normalizedRifOrId, 
                contactInfo: contactInfo || null, 
                address: address || null
            }
        });

        res.json(updatedAlly);
    } catch (error) {
        console.error('Error updating ally:', error);
        res.status(500).json({ message: 'Error al actualizar aliado' });
    }
};

export const deleteAlly = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Solo administradores pueden eliminar aliados' });
        }

        // Soft delete: marcar como eliminado
        await prisma.ally.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Aliado eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting ally:', error);
        res.status(500).json({ message: 'Error al eliminar aliado' });
    }
};

export const toggleAllyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingAlly = await prisma.ally.findUnique({ 
            where: { id },
            select: { isActive: true }
        });

        if (!existingAlly) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }

        const updatedAlly = await prisma.ally.update({
            where: { id },
            data: { isActive: !existingAlly.isActive }
        });

        res.json({ 
            message: `Aliado ${updatedAlly.isActive ? 'activado' : 'inactivado'} correctamente`,
            ally: updatedAlly
        });
    } catch (error) {
        console.error('Error toggling ally status:', error);
        res.status(500).json({ message: 'Error al cambiar estado del aliado' });
    }
};

// ============ TARIFAS (ServiceRate) ============

// Obtener tarifas de un aliado
export const getAllyRates = async (req, res) => {
    try {
        const { id } = req.params;
        
        const rates = await prisma.serviceRate.findMany({
            where: { allyId: id },
            include: {
                service: { select: { id: true, name: true, code: true } },
                zone: { select: { id: true, name: true } }
            },
            orderBy: [
                { service: { name: 'asc' } },
                { zone: { name: 'asc' } }
            ]
        });

        res.json(rates);
    } catch (error) {
        console.error('Error getting ally rates:', error);
        res.status(500).json({ message: 'Error al obtener tarifas del aliado' });
    }
};

// Crear/actualizar tarifa para un aliado
export const upsertAllyRate = async (req, res) => {
    try {
        const { id } = req.params; // allyId
        const { serviceId, zoneId, costPrice, salePrice, currency = 'USD', validUntil, originPort, destinationPort, shippingLine } = req.body;

        // Verificar que el aliado existe
        const ally = await prisma.ally.findUnique({ where: { id } });
        if (!ally) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }

        let rate;

        // Si es una tarifa de ruta (con puertos pero sin zona), creamos directamente
        // porque el constraint único solo funciona con zona
        if (originPort && destinationPort && !zoneId) {
            // Verificar si ya existe una tarifa idéntica (mismo aliado, servicio, origen, destino)
            const existingRate = await prisma.serviceRate.findFirst({
                where: {
                    allyId: id,
                    serviceId,
                    originPort,
                    destinationPort,
                    zoneId: null
                }
            });

            if (existingRate) {
                // Actualizar la tarifa existente
                rate = await prisma.serviceRate.update({
                    where: { id: existingRate.id },
                    data: {
                        costPrice: parseFloat(costPrice),
                        salePrice: parseFloat(salePrice),
                        currency,
                        validFrom: new Date(),
                        validUntil: validUntil ? new Date(validUntil) : null,
                        shippingLine: shippingLine || null
                    },
                    include: {
                        service: { select: { id: true, name: true, code: true } },
                        zone: { select: { id: true, name: true } }
                    }
                });
            } else {
                // Crear nueva tarifa de ruta
                rate = await prisma.serviceRate.create({
                    data: {
                        allyId: id,
                        serviceId,
                        zoneId: null,
                        costPrice: parseFloat(costPrice),
                        salePrice: parseFloat(salePrice),
                        currency,
                        validUntil: validUntil ? new Date(validUntil) : null,
                        originPort,
                        destinationPort,
                        shippingLine: shippingLine || null
                    },
                    include: {
                        service: { select: { id: true, name: true, code: true } },
                        zone: { select: { id: true, name: true } }
                    }
                });
            }
        } else {
            // Para tarifas con zona (o sin especificar ruta), usamos upsert normal
            rate = await prisma.serviceRate.upsert({
                where: {
                    allyId_serviceId_zoneId: {
                        allyId: id,
                        serviceId,
                        zoneId: zoneId || null
                    }
                },
                update: {
                    costPrice: parseFloat(costPrice),
                    salePrice: parseFloat(salePrice),
                    currency,
                    validFrom: new Date(),
                    validUntil: validUntil ? new Date(validUntil) : null,
                    originPort: originPort || null,
                    destinationPort: destinationPort || null,
                    shippingLine: shippingLine || null
                },
                create: {
                    allyId: id,
                    serviceId,
                    zoneId: zoneId || null,
                    costPrice: parseFloat(costPrice),
                    salePrice: parseFloat(salePrice),
                    currency,
                    validUntil: validUntil ? new Date(validUntil) : null,
                    originPort: originPort || null,
                    destinationPort: destinationPort || null,
                    shippingLine: shippingLine || null
                },
                include: {
                    service: { select: { id: true, name: true, code: true } },
                    zone: { select: { id: true, name: true } }
                }
            });
        }

        res.status(201).json(rate);
    } catch (error) {
        console.error('Error upserting ally rate:', error);
        res.status(500).json({ message: 'Error al guardar tarifa' });
    }
};

// Eliminar tarifa
export const deleteAllyRate = async (req, res) => {
    try {
        const { id, rateId } = req.params;

        await prisma.serviceRate.delete({
            where: { id: rateId }
        });

        res.json({ message: 'Tarifa eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting ally rate:', error);
        res.status(500).json({ message: 'Error al eliminar tarifa' });
    }
};

// Obtener todas las zonas (para el dropdown)
export const getZones = async (req, res) => {
    try {
        const zones = await prisma.zone.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(zones);
    } catch (error) {
        console.error('Error getting zones:', error);
        res.status(500).json({ message: 'Error al obtener zonas' });
    }
};

// Obtener todos los servicios (para el dropdown)
export const getServices = async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(services);
    } catch (error) {
        console.error('Error getting services:', error);
        res.status(500).json({ message: 'Error al obtener servicios' });
    }
};

