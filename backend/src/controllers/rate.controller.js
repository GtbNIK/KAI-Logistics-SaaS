import prisma from '../config/database.js';

/**
 * Helper: Calcular precios de venta basados en costos, fees y profits
 * Para region='OTHER', fees y profits son opcionales (0 por defecto)
 */
const calculateSalePrices = (cost20ft, cost40ft, bankFee = 0, profitYaho = 0, profitIS = 0) => {
    const sale20HC = parseFloat(cost20ft) + parseFloat(bankFee || 0) + parseFloat(profitYaho || 0) + parseFloat(profitIS || 0);
    const sale40HC = parseFloat(cost40ft) + parseFloat(bankFee || 0) + parseFloat(profitYaho || 0) + parseFloat(profitIS || 0);
    
    return {
        sale20HC: parseFloat(sale20HC.toFixed(2)),
        sale40HC: parseFloat(sale40HC.toFixed(2))
    };
};

/**
 * Helper: Resolver múltiples puertos desde array de IDs
 */
const resolvePorts = async (portIds) => {
    if (!portIds || portIds.length === 0) return [];
    return await prisma.port.findMany({
        where: { id: { in: portIds } },
        select: { id: true, name: true, code: true }
    });
};

const normalizeDecimals = (rate) => ({
    ...rate,
    cost20ft: parseFloat(rate.cost20ft),
    cost40ft: parseFloat(rate.cost40ft),
    bankFee: rate.bankFee !== null && rate.bankFee !== undefined ? parseFloat(rate.bankFee) : null,
    profitYaho: rate.profitYaho !== null && rate.profitYaho !== undefined ? parseFloat(rate.profitYaho) : null,
    profitIS: rate.profitIS !== null && rate.profitIS !== undefined ? parseFloat(rate.profitIS) : null,
    sale20HC: parseFloat(rate.sale20HC),
    sale40HC: parseFloat(rate.sale40HC)
});

const formatRateWithPorts = async (rate) => {
    if (!rate) return null;
    const [originPorts, destinationPorts] = await Promise.all([
        resolvePorts(rate.originPortIds),
        resolvePorts(rate.destinationPortIds)
    ]);

    return {
        ...normalizeDecimals(rate),
        originPorts,
        destinationPorts
    };
};

/**
 * GET /api/rates
 * Listar tarifas con filtros y paginación
 */
export const getRates = async (req, res) => {
    try {
        const { 
            region, 
            allyId,
            countryId,
            originPortId, 
            destinationPortId, 
            shippingLineId,
            isActive,        // 'true' | 'false' | undefined
            status = 'valid', // valid | expired | all | upcoming
            page = 1, 
            limit = 20 
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const now = new Date();

        // Construir filtros
        const where = {
            deletedAt: null // Excluir soft deleted por defecto
        };

        if (region) where.region = region;
        if (allyId) where.allyId = allyId;
        if (countryId) where.countryId = countryId;
        if (originPortId) where.originPortIds = { has: originPortId };
        if (destinationPortId) where.destinationPortIds = { has: destinationPortId };
        if (shippingLineId) where.shippingLineId = shippingLineId;
        if (isActive === 'true') where.isActive = true;
        if (isActive === 'false') where.isActive = false;

        // Filtro por estado de validez
        if (status === 'valid') {
            where.validFrom = { lte: now };
            where.validUntil = { gte: now };
        } else if (status === 'expired') {
            where.validUntil = { lt: now };
        } else if (status === 'upcoming') {
            where.validFrom = { gt: now };
        }
        // Si status === 'all', no agregamos filtro de validez

        const [rates, total] = await Promise.all([
            prisma.rate.findMany({
                where,
                include: {
                    ally: { select: { id: true, name: true, internalCode: true } },
                    country: { select: { id: true, name: true, code: true } },
                    shippingLine: { select: { id: true, name: true, code: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.rate.count({ where })
        ]);

        // Resolver múltiples puertos y convertir Decimals
        const formattedRates = await Promise.all(rates.map(formatRateWithPorts));

        res.json({
            data: formattedRates,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error getting rates:', error);
        res.status(500).json({ message: 'Error al obtener tarifas' });
    }
};

/**
 * POST /api/rates
 * Crear nueva tarifa
 */
export const createRate = async (req, res) => {
    try {
        const {
            region = 'CHINA',
            allyId,
            countryId,
            originPortIds,  // Array de IDs
            destinationPortIds,  // Array de IDs
            cost20ft,
            cost40ft,
            bankFee,
            profitYaho,
            profitIS,
            shippingLineId,
            freeDays = 21,
            validFrom,
            validUntil
        } = req.body;

        // Validaciones
        if (!allyId) {
            return res.status(400).json({ message: 'Se requiere allyId' });
        }

        if (!originPortIds || !Array.isArray(originPortIds) || originPortIds.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos un puerto de origen' });
        }

        if (!destinationPortIds || !Array.isArray(destinationPortIds) || destinationPortIds.length === 0) {
            return res.status(400).json({ message: 'Se requiere al menos un puerto de destino' });
        }

        // Si region es OTHER, countryId es obligatorio
        if (region === 'OTHER' && !countryId) {
            return res.status(400).json({ message: 'El país es obligatorio para tarifas de "Otros Países"' });
        }

        // Validar campos numéricos obligatorios
        if (cost20ft === undefined || cost20ft === null || parseFloat(cost20ft) < 0) {
            return res.status(400).json({ message: 'cost20ft debe ser un número mayor o igual a 0' });
        }
        if (cost40ft === undefined || cost40ft === null || parseFloat(cost40ft) < 0) {
            return res.status(400).json({ message: 'cost40ft debe ser un número mayor o igual a 0' });
        }

        // Para CHINA, fees y profits son obligatorios
        if (region === 'CHINA') {
            const chinaFields = { bankFee, profitYaho, profitIS };
            for (const [field, value] of Object.entries(chinaFields)) {
                if (value === undefined || value === null || parseFloat(value) < 0) {
                    return res.status(400).json({ message: `${field} es obligatorio para tarifas de China` });
                }
            }
        }

        const nowCreate = new Date();
        const validFromDate = validFrom ? new Date(validFrom) : nowCreate;
        const validUntilDate = new Date(validUntil);
        if (isNaN(validUntilDate)) {
            return res.status(400).json({ message: 'validUntil es inválido' });
        }
        if (validFrom && isNaN(validFromDate)) {
            return res.status(400).json({ message: 'validFrom es inválido' });
        }
        if (validUntilDate <= validFromDate) {
            return res.status(400).json({ message: 'validUntil debe ser posterior a validFrom' });
        }

        // Verificar que existan las entidades relacionadas
        const [ally, originPorts, destPorts, country, shippingLine] = await Promise.all([
            prisma.ally.findUnique({ where: { id: allyId } }),
            prisma.port.findMany({ where: { id: { in: originPortIds } } }),
            prisma.port.findMany({ where: { id: { in: destinationPortIds } } }),
            countryId ? prisma.country.findUnique({ where: { id: countryId } }) : null,
            shippingLineId ? prisma.shippingLine.findUnique({ where: { id: shippingLineId } }) : null
        ]);

        if (!ally) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }
        if (originPorts.length !== originPortIds.length) {
            return res.status(404).json({ message: 'Uno o más puertos de origen no encontrados' });
        }
        if (destPorts.length !== destinationPortIds.length) {
            return res.status(404).json({ message: 'Uno o más puertos de destino no encontrados' });
        }
        if (countryId && !country) {
            return res.status(404).json({ message: 'País no encontrado' });
        }
        if (shippingLineId && !shippingLine) {
            return res.status(404).json({ message: 'Línea naviera no encontrada' });
        }

        // Calcular precios de venta
        const { sale20HC, sale40HC } = calculateSalePrices(cost20ft, cost40ft, bankFee, profitYaho, profitIS);

        // Crear tarifa
        const rate = await prisma.rate.create({
            data: {
                region,
                allyId,
                countryId: countryId || null,
                originPortIds,
                destinationPortIds,
                cost20ft: parseFloat(cost20ft),
                cost40ft: parseFloat(cost40ft),
                bankFee: bankFee !== undefined ? parseFloat(bankFee) : null,
                profitYaho: profitYaho !== undefined ? parseFloat(profitYaho) : null,
                profitIS: profitIS !== undefined ? parseFloat(profitIS) : null,
                sale20HC,
                sale40HC,
                shippingLineId: shippingLineId || null,
                freeDays: parseInt(freeDays),
                validFrom: validFromDate,
                validUntil: validUntilDate
            },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });

        // Resolver puertos y convertir Decimals
        const formattedRate = await formatRateWithPorts(rate);

        res.status(201).json(formattedRate);

    } catch (error) {
        console.error('Error creating rate:', error);
        res.status(500).json({ message: 'Error al crear tarifa' });
    }
};

/**
 * PUT /api/rates/:id
 * Actualizar tarifa existente
 */
export const updateRate = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            region,
            allyId,
            countryId,
            originPortIds,
            destinationPortIds,
            cost20ft,
            cost40ft,
            bankFee,
            profitYaho,
            profitIS,
            shippingLineId,
            freeDays,
            validFrom,
            validUntil
        } = req.body;

        // Verificar que la tarifa existe y no está eliminada
        const existingRate = await prisma.rate.findUnique({
            where: { id }
        });

        if (!existingRate || existingRate.deletedAt) {
            return res.status(404).json({ message: 'Tarifa no encontrada' });
        }

        // Validaciones
        if (originPortIds && (!Array.isArray(originPortIds) || originPortIds.length === 0)) {
            return res.status(400).json({ message: 'originPortIds debe ser un array con al menos un elemento' });
        }
        if (destinationPortIds && (!Array.isArray(destinationPortIds) || destinationPortIds.length === 0)) {
            return res.status(400).json({ message: 'destinationPortIds debe ser un array con al menos un elemento' });
        }

        const numericFields = { cost20ft, cost40ft };
        for (const [field, value] of Object.entries(numericFields)) {
            if (value !== undefined && value !== null && parseFloat(value) < 0) {
                return res.status(400).json({ message: `${field} debe ser un número mayor o igual a 0` });
            }
        }

        let validFromDateUpdate;
        let validUntilDateUpdate;
        if (validFrom !== undefined) {
            validFromDateUpdate = validFrom ? new Date(validFrom) : null;
            if (validFrom && isNaN(validFromDateUpdate)) {
                return res.status(400).json({ message: 'validFrom es inválido' });
            }
        }
        if (validUntil !== undefined) {
            validUntilDateUpdate = validUntil ? new Date(validUntil) : null;
            if (validUntil && isNaN(validUntilDateUpdate)) {
                return res.status(400).json({ message: 'validUntil es inválido' });
            }
        }
        if (validFromDateUpdate || validUntilDateUpdate) {
            const vf = validFromDateUpdate ?? existingRate.validFrom;
            const vu = validUntilDateUpdate ?? existingRate.validUntil;
            if (vu <= vf) {
                return res.status(400).json({ message: 'validUntil debe ser posterior a validFrom' });
            }
        }

        // Construir datos de actualización
        const updateData = {};
        if (region !== undefined) updateData.region = region;
        if (allyId !== undefined) updateData.allyId = allyId;
        if (countryId !== undefined) updateData.countryId = countryId || null;
        if (originPortIds !== undefined) updateData.originPortIds = originPortIds;
        if (destinationPortIds !== undefined) updateData.destinationPortIds = destinationPortIds;
        if (cost20ft !== undefined) updateData.cost20ft = parseFloat(cost20ft);
        if (cost40ft !== undefined) updateData.cost40ft = parseFloat(cost40ft);
        if (bankFee !== undefined) updateData.bankFee = bankFee !== null ? parseFloat(bankFee) : null;
        if (profitYaho !== undefined) updateData.profitYaho = profitYaho !== null ? parseFloat(profitYaho) : null;
        if (profitIS !== undefined) updateData.profitIS = profitIS !== null ? parseFloat(profitIS) : null;
        if (shippingLineId !== undefined) updateData.shippingLineId = shippingLineId || null;
        if (freeDays !== undefined) updateData.freeDays = parseInt(freeDays);
        if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : existingRate.validFrom;
        if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);

        // Recalcular precios de venta si cambiaron los costos/fees/profits
        const needsRecalculation = cost20ft !== undefined || cost40ft !== undefined || 
                                   bankFee !== undefined || profitYaho !== undefined || profitIS !== undefined;

        if (needsRecalculation) {
            const finalCost20ft = cost20ft !== undefined ? cost20ft : existingRate.cost20ft;
            const finalCost40ft = cost40ft !== undefined ? cost40ft : existingRate.cost40ft;
            const finalBankFee = bankFee !== undefined ? bankFee : existingRate.bankFee;
            const finalProfitYaho = profitYaho !== undefined ? profitYaho : existingRate.profitYaho;
            const finalProfitIS = profitIS !== undefined ? profitIS : existingRate.profitIS;

            const { sale20HC, sale40HC } = calculateSalePrices(
                finalCost20ft, finalCost40ft, finalBankFee, finalProfitYaho, finalProfitIS
            );

            updateData.sale20HC = sale20HC;
            updateData.sale40HC = sale40HC;
        }

        // Actualizar tarifa
        const rate = await prisma.rate.update({
            where: { id },
            data: updateData,
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });

        // Resolver puertos y convertir Decimals
        const formattedRate = await formatRateWithPorts(rate);

        res.json(formattedRate);

    } catch (error) {
        console.error('Error updating rate:', error);
        res.status(500).json({ message: 'Error al actualizar tarifa' });
    }
};

/**
 * DELETE /api/rates/:id
 * Soft delete de tarifa
 */
export const deleteRate = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la tarifa existe
        const existingRate = await prisma.rate.findUnique({
            where: { id }
        });

        if (!existingRate) {
            return res.status(404).json({ message: 'Tarifa no encontrada' });
        }

        if (existingRate.deletedAt) {
            return res.status(400).json({ message: 'La tarifa ya está eliminada' });
        }

        // Soft delete
        await prisma.rate.update({
            where: { id },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Tarifa eliminada correctamente' });

    } catch (error) {
        console.error('Error deleting rate:', error);
        res.status(500).json({ message: 'Error al eliminar tarifa' });
    }
};

/**
 * GET /api/rates/expired
 * Listar tarifas expiradas (para limpieza administrativa)
 */
export const getExpiredRates = async (req, res) => {
    try {
        const now = new Date();

        const rates = await prisma.rate.findMany({
            where: {
                validUntil: { lt: now },
                deletedAt: null
            },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: { validUntil: 'asc' }
        });

        const formattedRates = await Promise.all(rates.map(formatRateWithPorts));

        res.json({
            data: formattedRates,
            total: formattedRates.length
        });

    } catch (error) {
        console.error('Error getting expired rates:', error);
        res.status(500).json({ message: 'Error al obtener tarifas expiradas' });
    }
};

/**
 * Helper: Formatear rate con Decimals convertidos a number
 */
/**
 * PATCH /api/rates/:id/toggle-active
 * Activar/desactivar una tarifa individual
 */
export const toggleActive = async (req, res) => {
    try {
        const { id } = req.params;

        const existingRate = await prisma.rate.findUnique({ where: { id } });
        if (!existingRate || existingRate.deletedAt) {
            return res.status(404).json({ message: 'Tarifa no encontrada' });
        }

        // Si se quiere activar, verificar que no esté expirada
        if (!existingRate.isActive && existingRate.validUntil < new Date()) {
            return res.status(400).json({ 
                message: 'No se puede activar una tarifa expirada. Actualiza la fecha de validez primero.' 
            });
        }

        const rate = await prisma.rate.update({
            where: { id },
            data: { isActive: !existingRate.isActive },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });
        const formattedRate = await formatRateWithPorts(rate);

        res.json(formattedRate);
    } catch (error) {
        console.error('Error toggling rate active:', error);
        res.status(500).json({ message: 'Error al cambiar estado de la tarifa' });
    }
};

/**
 * PATCH /api/rates/bulk-activate
 * Activar todas las tarifas de un aliado (vigentes)
 * Body: { allyId }
 */
export const bulkActivate = async (req, res) => {
    try {
        const { allyId } = req.body;

        if (!allyId) {
            return res.status(400).json({ message: 'Se requiere allyId' });
        }

        const now = new Date();
        const result = await prisma.rate.updateMany({
            where: {
                allyId,
                deletedAt: null,
                validFrom: { lte: now },
                validUntil: { gte: now } // Solo activar las vigentes
            },
            data: { isActive: true }
        });

        res.json({ 
            message: `Se activaron ${result.count} tarifa(s)`,
            count: result.count
        });
    } catch (error) {
        console.error('Error bulk activating rates:', error);
        res.status(500).json({ message: 'Error al activar tarifas' });
    }
};

/**
 * PATCH /api/rates/bulk-deactivate
 * Desactivar todas las tarifas de un aliado
 * Body: { allyId }
 */
export const bulkDeactivate = async (req, res) => {
    try {
        const { allyId } = req.body;

        if (!allyId) {
            return res.status(400).json({ message: 'Se requiere allyId' });
        }

        const result = await prisma.rate.updateMany({
            where: {
                allyId,
                deletedAt: null
            },
            data: { isActive: false }
        });

        res.json({ 
            message: `Se desactivaron ${result.count} tarifa(s)`,
            count: result.count
        });
    } catch (error) {
        console.error('Error bulk deactivating rates:', error);
        res.status(500).json({ message: 'Error al desactivar tarifas' });
    }
};

/**
 * GET /api/rates/find
 * Buscar tarifa activa exacta (para cotizaciones)
 * Query: allyId, originPortId, destinationPortId, shippingLineId (opcional)
 */
export const findRate = async (req, res) => {
    try {
        const { allyId, originPortId, destinationPortId, shippingLineId } = req.query;

        if (!allyId || !originPortId || !destinationPortId) {
            return res.status(400).json({ 
                message: 'Se requiere allyId, originPortId y destinationPortId' 
            });
        }

        const now = new Date();
        const where = {
            allyId,
            originPortIds: { has: originPortId },
            destinationPortIds: { has: destinationPortId },
            isActive: true,
            deletedAt: null,
            validFrom: { lte: now },
            validUntil: { gte: now }
        };

        if (shippingLineId) where.shippingLineId = shippingLineId;

        const rate = await prisma.rate.findFirst({
            where,
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!rate) {
            return res.json({ found: false, rate: null });
        }

        const formattedRate = await formatRateWithPorts(rate);

        res.json({ found: true, rate: formattedRate });
    } catch (error) {
        console.error('Error finding rate:', error);
        res.status(500).json({ message: 'Error al buscar tarifa' });
    }
};

/**
 * GET /api/rates/by-ally/:allyId
 * Obtener todas las tarifas de un aliado (para mostrar en modal de detalle)
 */
export const getRatesByAlly = async (req, res) => {
    try {
        const { allyId } = req.params;

        const rates = await prisma.rate.findMany({
            where: { allyId, deletedAt: null },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        const formattedRates = await Promise.all(rates.map(formatRateWithPorts));

        res.json({ data: formattedRates, total: formattedRates.length });
    } catch (error) {
        console.error('Error getting rates by ally:', error);
        res.status(500).json({ message: 'Error al obtener tarifas del aliado' });
    }
};

/**
 * GET /api/rates/by-port/:portId
 * Obtener todas las tarifas donde participa un puerto (origen o destino)
 */
export const getRatesByPort = async (req, res) => {
    try {
        const { portId } = req.params;

        const rates = await prisma.rate.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { originPortIds: { has: portId } },
                    { destinationPortIds: { has: portId } }
                ]
            },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        const formattedRates = await Promise.all(rates.map(formatRateWithPorts));

        res.json({ data: formattedRates, total: formattedRates.length });
    } catch (error) {
        console.error('Error getting rates by port:', error);
        res.status(500).json({ message: 'Error al obtener tarifas del puerto' });
    }
};

/**
 * GET /api/rates/by-shipping-line/:shippingLineId
 * Obtener todas las tarifas de una línea naviera
 */
export const getRatesByShippingLine = async (req, res) => {
    try {
        const { shippingLineId } = req.params;

        const rates = await prisma.rate.findMany({
            where: { shippingLineId, deletedAt: null },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                country: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        const formattedRates = await Promise.all(rates.map(formatRateWithPorts));

        res.json({ data: formattedRates, total: formattedRates.length });
    } catch (error) {
        console.error('Error getting rates by shipping line:', error);
        res.status(500).json({ message: 'Error al obtener tarifas de la línea naviera' });
    }
};
