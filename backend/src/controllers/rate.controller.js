import prisma from '../config/database.js';

/**
 * Helper: Calcular precios de venta basados en costos, fees y profits
 */
const calculateSalePrices = (cost20ft, cost40ft, bankFee, profitYaho, profitIS) => {
    const sale20HC = parseFloat(cost20ft) + parseFloat(bankFee) + parseFloat(profitYaho) + parseFloat(profitIS);
    const sale40HC = parseFloat(cost40ft) + parseFloat(bankFee) + parseFloat(profitYaho) + parseFloat(profitIS);
    
    return {
        sale20HC: parseFloat(sale20HC.toFixed(2)),
        sale40HC: parseFloat(sale40HC.toFixed(2))
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
            originPortId, 
            destinationPortId, 
            shippingLineId,
            isActive,        // 'true' | 'false' | undefined
            status = 'valid', // valid | expired | all
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
        if (originPortId) where.originPortId = originPortId;
        if (destinationPortId) where.destinationPortId = destinationPortId;
        if (shippingLineId) where.shippingLineId = shippingLineId;
        if (isActive === 'true') where.isActive = true;
        if (isActive === 'false') where.isActive = false;

        // Filtro por estado de validez
        if (status === 'valid') {
            where.validUntil = { gte: now };
        } else if (status === 'expired') {
            where.validUntil = { lt: now };
        }
        // Si status === 'all', no agregamos filtro de validez

        const [rates, total] = await Promise.all([
            prisma.rate.findMany({
                where,
                include: {
                    ally: { select: { id: true, name: true, internalCode: true } },
                    originPort: { select: { id: true, name: true, code: true } },
                    destinationPort: { select: { id: true, name: true, code: true } },
                    shippingLine: { select: { id: true, name: true, code: true } }
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.rate.count({ where })
        ]);

        // Convertir Decimals a números
        const formattedRates = rates.map(rate => ({
            ...rate,
            cost20ft: parseFloat(rate.cost20ft),
            cost40ft: parseFloat(rate.cost40ft),
            bankFee: parseFloat(rate.bankFee),
            profitYaho: parseFloat(rate.profitYaho),
            profitIS: parseFloat(rate.profitIS),
            sale20HC: parseFloat(rate.sale20HC),
            sale40HC: parseFloat(rate.sale40HC)
        }));

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
            originPortId,
            destinationPortId,
            cost20ft,
            cost40ft,
            bankFee,
            profitYaho,
            profitIS,
            shippingLineId,
            freeDays = 21,
            validUntil
        } = req.body;

        // Validaciones
        if (!allyId || !originPortId || !destinationPortId) {
            return res.status(400).json({ 
                message: 'Se requiere allyId, originPortId y destinationPortId' 
            });
        }

        if (originPortId === destinationPortId) {
            return res.status(400).json({ 
                message: 'El puerto de origen debe ser diferente al puerto de destino' 
            });
        }

        const numericFields = { cost20ft, cost40ft, bankFee, profitYaho, profitIS };
        for (const [field, value] of Object.entries(numericFields)) {
            if (value === undefined || value === null || parseFloat(value) < 0) {
                return res.status(400).json({ 
                    message: `El campo ${field} debe ser un número mayor o igual a 0` 
                });
            }
        }

        const validUntilDate = new Date(validUntil);
        if (validUntilDate <= new Date()) {
            return res.status(400).json({ 
                message: 'La fecha de validez debe ser futura' 
            });
        }

        // Verificar que existan las entidades relacionadas
        const [ally, originPort, destPort, shippingLine] = await Promise.all([
            prisma.ally.findUnique({ where: { id: allyId } }),
            prisma.port.findUnique({ where: { id: originPortId } }),
            prisma.port.findUnique({ where: { id: destinationPortId } }),
            shippingLineId ? prisma.shippingLine.findUnique({ where: { id: shippingLineId } }) : null
        ]);

        if (!ally) {
            return res.status(404).json({ message: 'Aliado no encontrado' });
        }
        if (!originPort) {
            return res.status(404).json({ message: 'Puerto de origen no encontrado' });
        }
        if (!destPort) {
            return res.status(404).json({ message: 'Puerto de destino no encontrado' });
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
                originPortId,
                destinationPortId,
                cost20ft: parseFloat(cost20ft),
                cost40ft: parseFloat(cost40ft),
                bankFee: parseFloat(bankFee),
                profitYaho: parseFloat(profitYaho),
                profitIS: parseFloat(profitIS),
                sale20HC,
                sale40HC,
                shippingLineId: shippingLineId || null,
                freeDays: parseInt(freeDays),
                validUntil: validUntilDate
            },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });

        // Convertir Decimals
        const formattedRate = {
            ...rate,
            cost20ft: parseFloat(rate.cost20ft),
            cost40ft: parseFloat(rate.cost40ft),
            bankFee: parseFloat(rate.bankFee),
            profitYaho: parseFloat(rate.profitYaho),
            profitIS: parseFloat(rate.profitIS),
            sale20HC: parseFloat(rate.sale20HC),
            sale40HC: parseFloat(rate.sale40HC)
        };

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
            originPortId,
            destinationPortId,
            cost20ft,
            cost40ft,
            bankFee,
            profitYaho,
            profitIS,
            shippingLineId,
            freeDays,
            validUntil
        } = req.body;

        // Verificar que la tarifa existe y no está eliminada
        const existingRate = await prisma.rate.findUnique({
            where: { id }
        });

        if (!existingRate || existingRate.deletedAt) {
            return res.status(404).json({ message: 'Tarifa no encontrada' });
        }

        // Validaciones si se proporcionan
        if (originPortId && destinationPortId && originPortId === destinationPortId) {
            return res.status(400).json({ 
                message: 'El puerto de origen debe ser diferente al puerto de destino' 
            });
        }

        const numericFields = { cost20ft, cost40ft, bankFee, profitYaho, profitIS };
        for (const [field, value] of Object.entries(numericFields)) {
            if (value !== undefined && value !== null && parseFloat(value) < 0) {
                return res.status(400).json({ 
                    message: `El campo ${field} debe ser un número mayor o igual a 0` 
                });
            }
        }

        if (validUntil) {
            const validUntilDate = new Date(validUntil);
            if (validUntilDate <= new Date()) {
                return res.status(400).json({ 
                    message: 'La fecha de validez debe ser futura' 
                });
            }
        }

        // Construir datos de actualización
        const updateData = {};
        if (region !== undefined) updateData.region = region;
        if (allyId !== undefined) updateData.allyId = allyId;
        if (originPortId !== undefined) updateData.originPortId = originPortId;
        if (destinationPortId !== undefined) updateData.destinationPortId = destinationPortId;
        if (cost20ft !== undefined) updateData.cost20ft = parseFloat(cost20ft);
        if (cost40ft !== undefined) updateData.cost40ft = parseFloat(cost40ft);
        if (bankFee !== undefined) updateData.bankFee = parseFloat(bankFee);
        if (profitYaho !== undefined) updateData.profitYaho = parseFloat(profitYaho);
        if (profitIS !== undefined) updateData.profitIS = parseFloat(profitIS);
        if (shippingLineId !== undefined) updateData.shippingLineId = shippingLineId || null;
        if (freeDays !== undefined) updateData.freeDays = parseInt(freeDays);
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
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });

        // Convertir Decimals
        const formattedRate = {
            ...rate,
            cost20ft: parseFloat(rate.cost20ft),
            cost40ft: parseFloat(rate.cost40ft),
            bankFee: parseFloat(rate.bankFee),
            profitYaho: parseFloat(rate.profitYaho),
            profitIS: parseFloat(rate.profitIS),
            sale20HC: parseFloat(rate.sale20HC),
            sale40HC: parseFloat(rate.sale40HC)
        };

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
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: { validUntil: 'asc' }
        });

        // Convertir Decimals
        const formattedRates = rates.map(rate => ({
            ...rate,
            cost20ft: parseFloat(rate.cost20ft),
            cost40ft: parseFloat(rate.cost40ft),
            bankFee: parseFloat(rate.bankFee),
            profitYaho: parseFloat(rate.profitYaho),
            profitIS: parseFloat(rate.profitIS),
            sale20HC: parseFloat(rate.sale20HC),
            sale40HC: parseFloat(rate.sale40HC)
        }));

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
const formatRate = (rate) => ({
    ...rate,
    cost20ft: parseFloat(rate.cost20ft),
    cost40ft: parseFloat(rate.cost40ft),
    bankFee: parseFloat(rate.bankFee),
    profitYaho: parseFloat(rate.profitYaho),
    profitIS: parseFloat(rate.profitIS),
    sale20HC: parseFloat(rate.sale20HC),
    sale40HC: parseFloat(rate.sale40HC)
});

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
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            }
        });

        res.json(formatRate(rate));
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
            originPortId,
            destinationPortId,
            isActive: true,
            deletedAt: null,
            validUntil: { gte: now }
        };

        if (shippingLineId) where.shippingLineId = shippingLineId;

        const rate = await prisma.rate.findFirst({
            where,
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (!rate) {
            return res.json({ found: false, rate: null });
        }

        res.json({ found: true, rate: formatRate(rate) });
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
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        res.json({ data: rates.map(formatRate), total: rates.length });
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
                    { originPortId: portId },
                    { destinationPortId: portId }
                ]
            },
            include: {
                ally: { select: { id: true, name: true, internalCode: true } },
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } },
                shippingLine: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        res.json({ data: rates.map(formatRate), total: rates.length });
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
                originPort: { select: { id: true, name: true, code: true } },
                destinationPort: { select: { id: true, name: true, code: true } }
            },
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
        });

        res.json({ data: rates.map(formatRate), total: rates.length });
    } catch (error) {
        console.error('Error getting rates by shipping line:', error);
        res.status(500).json({ message: 'Error al obtener tarifas de la línea naviera' });
    }
};
