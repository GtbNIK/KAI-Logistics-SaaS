import prisma from '../lib/prisma.js';

/**
 * GET /api/rates/find
 * Busca una tarifa específica según servicio, aliado y opcionalmente zona
 * Query params: serviceId, allyId, zoneId (opcional)
 */
export const findRate = async (req, res) => {
    try {
        const { serviceId, allyId, zoneId, originPort, destinationPort } = req.query;

        if (!serviceId || !allyId) {
            return res.status(400).json({ 
                message: 'Se requiere serviceId y allyId' 
            });
        }

        // Buscar tarifa vigente
        const now = new Date();
        
        const whereClause = {
            serviceId,
            allyId,
            // Solo incluir zoneId si se proporciona (servicios terrestres)
            ...(zoneId && { zoneId }),
            // Para servicios marítimos/aéreos, buscar por puertos
            ...(originPort && { originPort: { contains: originPort, mode: 'insensitive' } }),
            ...(destinationPort && { destinationPort: { contains: destinationPort, mode: 'insensitive' } }),
            // Verificar vigencia
            validFrom: { lte: now },
            OR: [
                { validUntil: null },
                { validUntil: { gte: now } }
            ]
        };

        const rate = await prisma.serviceRate.findFirst({
            where: whereClause,
            include: {
                service: { select: { id: true, name: true, type: true } },
                ally: { select: { id: true, name: true } },
                zone: { select: { id: true, name: true, internalCode: true } }
            },
            orderBy: { createdAt: 'desc' } // Si hay múltiples, tomar la más reciente
        });

        if (!rate) {
            return res.status(404).json({ 
                message: 'No se encontró tarifa para esta combinación',
                found: false
            });
        }

        // Convertir Decimal a número para el frontend
        res.json({
            found: true,
            rate: {
                id: rate.id,
                costPrice: parseFloat(rate.costPrice),
                salePrice: parseFloat(rate.salePrice),
                currency: rate.currency,
                originPort: rate.originPort,
                destinationPort: rate.destinationPort,
                shippingLine: rate.shippingLine,
                validFrom: rate.validFrom,
                validUntil: rate.validUntil,
                service: rate.service,
                ally: rate.ally,
                zone: rate.zone
            }
        });

    } catch (error) {
        console.error('Error finding rate:', error);
        res.status(500).json({ message: 'Error al buscar tarifa' });
    }
};

/**
 * GET /api/rates
 * Lista todas las tarifas (para administración)
 */
export const getRates = async (req, res) => {
    try {
        const { page = 1, limit = 20, serviceId, allyId, zoneId } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (serviceId) where.serviceId = serviceId;
        if (allyId) where.allyId = allyId;
        if (zoneId) where.zoneId = zoneId;

        const [rates, total] = await Promise.all([
            prisma.serviceRate.findMany({
                where,
                include: {
                    service: { select: { id: true, name: true, type: true } },
                    ally: { select: { id: true, name: true } },
                    zone: { select: { id: true, name: true, internalCode: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.serviceRate.count({ where })
        ]);

        // Convertir Decimals
        const formattedRates = rates.map(rate => ({
            ...rate,
            costPrice: parseFloat(rate.costPrice),
            salePrice: parseFloat(rate.salePrice)
        }));

        res.json({
            data: formattedRates,
            meta: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error getting rates:', error);
        res.status(500).json({ message: 'Error al obtener tarifas' });
    }
};
