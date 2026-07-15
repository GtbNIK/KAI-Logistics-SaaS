import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

/**
 * @route   GET /api/shipments
 * @desc    Listar todos los embarques con filtros
 */
export const getShipments = async (req, res) => {
    try {
        const { search, type, status, vendedorId } = req.query;

        const where = {};

        if (type) where.type = type;
        if (status) where.status = status;
        if (vendedorId) where.vendedorId = vendedorId;

        if (search) {
            const or = [
                { blNumber: { contains: search, mode: 'insensitive' } },
                { bookingNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { shippingLineRel: { name: { contains: search, mode: 'insensitive' } } },
            ];
            // Buscar por número de embarque: acepta '42' o 'EMB-00042'
            const numberMatch = String(search).match(/\d+/);
            if (numberMatch) {
                const n = parseInt(numberMatch[0], 10);
                if (!isNaN(n)) {
                    or.push({ number: n });
                }
            }
            where.OR = or;
        }

        const shipments = await prisma.shipment.findMany({
            where: {
                ...where,
                deletedAt: null,
            },
            include: {
                paymentNotice: {
                    select: {
                        number: true,
                        client: { select: { name: true } },
                    }
                },
                vendedor: { select: { id: true, name: true } },
                updatedBy: { select: { name: true } },
                shippingLineRel: { select: { id: true, name: true, code: true } },
                clientRel: { select: { id: true, name: true, rifOrId: true } },
                airLine: { select: { id: true, name: true, code: true } },
                d2dShipmentItems: {
                    include: {
                        d2dItem: { select: { id: true, description: true } }
                    }
                },
                containers: true,
                aliado: { select: { id: true, name: true, internalCode: true } },
                d2dAliado: { select: { id: true, name: true, internalCode: true } },
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(shipments);
    } catch (error) {
        console.error('Error fetching shipments:', error);
        res.status(500).json({ message: 'Error al obtener embarques' });
    }
};

/**
 * @route   GET /api/shipments/:id
 * @desc    Obtener detalle de un embarque
 */
export const getShipment = async (req, res) => {
    try {
        const shipment = await prisma.shipment.findUnique({
            where: { id: req.params.id },
            include: {
                paymentNotice: {
                    select: {
                        id: true,
                        number: true,
                        client: { select: { name: true, rifOrId: true } },
                        items: true,
                    }
                },
                vendedor: { select: { id: true, name: true } },
                updatedBy: { select: { name: true } },
                shippingLineRel: { select: { id: true, name: true, code: true } },
                clientRel: { select: { id: true, name: true, rifOrId: true } },
                airLine: { select: { id: true, name: true, code: true } },
                d2dShipmentItems: {
                    include: {
                        d2dItem: { select: { id: true, description: true } }
                    }
                },
                containers: true,
                aliado: { select: { id: true, name: true, internalCode: true } },
                d2dAliado: { select: { id: true, name: true, internalCode: true } },
            }
        });

        if (!shipment) {
            return res.status(404).json({ message: 'Embarque no encontrado' });
        }

        res.json(shipment);
    } catch (error) {
        console.error('Error fetching shipment:', error);
        res.status(500).json({ message: 'Error al obtener embarque' });
    }
};

/**
 * @route   POST /api/shipments
 * @desc    Crear un nuevo embarque/tracking
 */
export const createShipment = async (req, res) => {
    try {
        const {
            paymentNoticeId, type, blNumber, whNumber, bookingNumber,
            shippingLineId, airLineId, status, clientId, clientName,
vendedorId, currentLocation, arrivalDate,
            tracking, pVol, pMax, value, dimensions,
            originPort, destPort, etd, eta,
            weight, quantity, cbm, d2dItemIds,
            // Nuevos campos FCL
            transitTime, aliadoId, containers,
            // Nuevos campos D2D
            cst, consolidadoManual, transportType, d2dEta, deliveryPlace, d2dTransitTime, d2dAliadoId,
            // Campos CONSOLIDADO
            consolidadoNumber, arrivalPort, consolidadoTransitTime
        } = req.body;

        if (!type) {
            return res.status(400).json({ message: 'El tipo de embarque es requerido (FCL, D2D o CONSOLIDADO)' });
        }

        // Normalizar: string vacío → null para evitar error de FK en Prisma
        const noticeId = paymentNoticeId || null;
        const resolvedClientId = clientId || null;
        const resolvedShippingLineId = shippingLineId || null;
        const resolvedAirLineId = airLineId || null;

        // Si se pasa un aviso de cobro, verificar que exista y no tenga tracking ya
        let notice = null;
        if (noticeId) {
            notice = await prisma.paymentNotice.findUnique({
                where: { id: noticeId },
                include: { tracking: true, client: { select: { name: true } } }
            });

            if (!notice) {
                return res.status(404).json({ message: 'Aviso de cobro no encontrado' });
            }

            if (notice.tracking) {
                return res.status(400).json({ message: 'Este aviso de cobro ya tiene un tracking asignado' });
            }
        }

        const data = {
            type,
            blNumber: blNumber || null,
            whNumber: whNumber || null,
            bookingNumber: bookingNumber || null,
            shippingLineId: resolvedShippingLineId,
            airLineId: resolvedAirLineId,
            status: status || undefined,
            clientId: resolvedClientId,
            clientName: clientName || notice?.client?.name || null,
            vendedorId: vendedorId || null,
            currentLocation: currentLocation || null,
            arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
            tracking: tracking || null,
            pVol: pVol ? parseFloat(pVol) : null,
            pMax: pMax ? parseFloat(pMax) : null,
            value: value ? parseFloat(value) : null,
            dimensions: dimensions || null,
            updatedById: req.user.id,
        };

        // Vincular al aviso si se proveyó
        if (noticeId) data.paymentNoticeId = noticeId;


        // FCL fields
        if (type === 'FCL') {
            data.originPort = originPort || null;
            data.destPort = destPort || null;
            data.etd = etd ? new Date(etd) : null;
            data.eta = eta ? new Date(eta) : null;
            data.transitTime = transitTime ? parseInt(transitTime) : null;
            data.aliadoId = aliadoId || null;
        }

        // D2D fields (blNumber y etd comparten el esquema común de Shipment)
        if (type === 'D2D') {
            data.weight = weight ? parseFloat(weight) : null;
            data.quantity = quantity ? parseInt(quantity) : null;
            data.cbm = cbm ? parseFloat(cbm) : null;
            data.originPort = originPort || null;
            data.cst = cst || null;
            data.consolidadoManual = consolidadoManual || null;
            data.transportType = transportType || null;
            data.etd = etd ? new Date(etd) : null;
            data.d2dEta = d2dEta ? new Date(d2dEta) : null;
            data.deliveryPlace = deliveryPlace || null;
            data.d2dTransitTime = d2dTransitTime ? parseInt(d2dTransitTime) : null;
            data.d2dAliadoId = d2dAliadoId || null;
        }

        // CONSOLIDADO fields
        if (type === 'CONSOLIDADO') {
            data.consolidadoNumber = consolidadoNumber || null;
            data.blNumber = blNumber || null;
            data.etd = etd ? new Date(etd) : null;
            data.eta = eta ? new Date(eta) : null;
            data.arrivalPort = arrivalPort || null;
            data.consolidadoTransitTime = consolidadoTransitTime ? parseInt(consolidadoTransitTime) : null;
        }

        const shipment = await prisma.shipment.create({
            data,
            include: {
                paymentNotice: { select: { number: true, client: { select: { name: true } } } },
                vendedor: { select: { id: true, name: true } },
                shippingLineRel: { select: { id: true, name: true } },
                clientRel: { select: { id: true, name: true } },
                d2dShipmentItems: {
                    include: {
                        d2dItem: { select: { id: true, description: true } }
                    }
                },
            }
        });

        // Crear ShipmentContainers si type es FCL y se enviaron containers
        if (type === 'FCL' && containers && Array.isArray(containers) && containers.length > 0) {
            await prisma.shipmentContainer.createMany({
                data: containers.map(c => ({
                    shipmentId: shipment.id,
                    containerType: c.containerType,
                    quantity: c.quantity || 1
                }))
            });
        }

        // Crear D2DShipmentItems si type es D2D y se enviaron IDs
        if (type === 'D2D' && d2dItemIds && Array.isArray(d2dItemIds) && d2dItemIds.length > 0) {
            await prisma.d2DShipmentItem.createMany({
                data: d2dItemIds.map(itemId => ({
                    shipmentId: shipment.id,
                    d2dItemId: itemId
                }))
            });
        }

        res.status(201).json(shipment);
    } catch (error) {
        console.error('Error creating shipment:', error);
        res.status(500).json({ message: 'Error al crear embarque' });
    }
};

/**
 * @route   PUT /api/shipments/:id
 * @desc    Actualizar un embarque
 */
export const updateShipment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            blNumber, whNumber, bookingNumber, shippingLineId, airLineId, status,
            clientId, clientName, vendedorId, currentLocation, arrivalDate,
            tracking, pVol, pMax, value, dimensions,
            originPort, destPort, etd, eta,
            weight, quantity, cbm, d2dItemIds,
            // Nuevos campos FCL
            transitTime, aliadoId, containers,
            // Nuevos campos D2D
            cst, consolidadoManual, transportType, d2dEta, deliveryPlace, d2dTransitTime, d2dAliadoId,
            // Campos CONSOLIDADO
            consolidadoNumber, arrivalPort, consolidadoTransitTime
        } = req.body;

        const existing = await prisma.shipment.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: 'Embarque no encontrado' });
        }

        const data = { updatedById: req.user.id };

        // Campos comunes (solo si se envían)
        if (blNumber !== undefined) data.blNumber = blNumber || null;
        if (whNumber !== undefined) data.whNumber = whNumber || null;
        if (bookingNumber !== undefined) data.bookingNumber = bookingNumber || null;
        if (shippingLineId !== undefined) data.shippingLineId = shippingLineId || null;
        if (airLineId !== undefined) data.airLineId = airLineId || null;
        if (status !== undefined) data.status = status;
        if (clientName !== undefined) data.clientName = clientName || null;
        if (vendedorId !== undefined) data.vendedorId = vendedorId || null;
        if (currentLocation !== undefined) data.currentLocation = currentLocation || null;
        if (arrivalDate !== undefined) data.arrivalDate = arrivalDate ? new Date(arrivalDate) : null;
        if (tracking !== undefined) data.tracking = tracking || null;
        if (pVol !== undefined) data.pVol = pVol ? parseFloat(pVol) : null;
        if (pMax !== undefined) data.pMax = pMax ? parseFloat(pMax) : null;
        if (value !== undefined) data.value = value ? parseFloat(value) : null;
        if (dimensions !== undefined) data.dimensions = dimensions || null;
        if (originPort !== undefined) data.originPort = originPort || null;
        if (destPort !== undefined) data.destPort = destPort || null;
        if (etd !== undefined) data.etd = etd ? new Date(etd) : null;
        if (eta !== undefined) data.eta = eta ? new Date(eta) : null;
        if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
        if (quantity !== undefined) data.quantity = quantity ? parseInt(quantity) : null;
        if (cbm !== undefined) data.cbm = cbm ? parseFloat(cbm) : null;
        
        // Nuevos campos FCL
        if (transitTime !== undefined) data.transitTime = transitTime ? parseInt(transitTime) : null;
        if (aliadoId !== undefined) data.aliadoId = aliadoId || null;
        
        // Nuevos campos D2D
        if (cst !== undefined) data.cst = cst || null;
        if (consolidadoManual !== undefined) data.consolidadoManual = consolidadoManual || null;
        if (transportType !== undefined) data.transportType = transportType || null;
        if (d2dEta !== undefined) data.d2dEta = d2dEta ? new Date(d2dEta) : null;
        if (deliveryPlace !== undefined) data.deliveryPlace = deliveryPlace || null;
        if (d2dTransitTime !== undefined) data.d2dTransitTime = d2dTransitTime ? parseInt(d2dTransitTime) : null;
        if (d2dAliadoId !== undefined) data.d2dAliadoId = d2dAliadoId || null;
        
        // Campos CONSOLIDADO
        if (consolidadoNumber !== undefined) data.consolidadoNumber = consolidadoNumber || null;
        if (arrivalPort !== undefined) data.arrivalPort = arrivalPort || null;
        if (consolidadoTransitTime !== undefined) data.consolidadoTransitTime = consolidadoTransitTime ? parseInt(consolidadoTransitTime) : null;

        // Si se envían containers, actualizar la relación 1:N (FCL)
        if (containers !== undefined && existing.type === 'FCL') {
            // Eliminar containers existentes
            await prisma.shipmentContainer.deleteMany({
                where: { shipmentId: id }
            });
            // Crear nuevos containers si hay
            if (Array.isArray(containers) && containers.length > 0) {
                await prisma.shipmentContainer.createMany({
                    data: containers.map(c => ({
                        shipmentId: id,
                        containerType: c.containerType,
                        quantity: c.quantity || 1
                    }))
                });
            }
        }

        // Si se envían d2dItemIds, actualizar la relación N:M
        if (d2dItemIds !== undefined && existing.type === 'D2D') {
            // Eliminar items existentes
            await prisma.d2DShipmentItem.deleteMany({
                where: { shipmentId: id }
            });
            // Crear nuevos items si hay
            if (Array.isArray(d2dItemIds) && d2dItemIds.length > 0) {
                await prisma.d2DShipmentItem.createMany({
                    data: d2dItemIds.map(itemId => ({
                        shipmentId: id,
                        d2dItemId: itemId
                    }))
                });
            }
        }

        const shipment = await prisma.shipment.update({
            where: { id },
            data,
            include: {
                paymentNotice: { select: { number: true, client: { select: { name: true } } } },
                vendedor: { select: { id: true, name: true } },
                shippingLineRel: { select: { id: true, name: true } },
                clientRel: { select: { id: true, name: true } },
                d2dShipmentItems: {
                    include: {
                        d2dItem: { select: { id: true, description: true } }
                    }
                },
            }
        });

        if (status !== undefined && existing.status !== status) {
            const statusTranslations = {
                PENDING: 'Pendiente',
                AT_ORIGIN_WAREHOUSE: 'En Almacén Origen',
                AT_ORIGIN_PORT: 'En Puerto Origen',
                ON_VESSEL: 'En Tránsito',
                AT_DESTINATION_PORT: 'En Puerto Destino',
                CUSTOMS_CLEARANCE: 'En Aduana',
                ARRIVED: 'Arribado',
                DELIVERED: 'Entregado'
            };
            const translatedStatus = statusTranslations[status] || status;

            await createNotification({
                title: 'Estado de Tracking Actualizado',
                message: `El tracking EMB-${String(shipment.number).padStart(5, '0')} ha cambiado a estado: "${translatedStatus}".`,
                type: 'INFO',
                targetRoles: ['ADMIN'],
                entityType: 'SHIPMENT',
                entityId: shipment.id
            });
        }

        res.json(shipment);
    } catch (error) {
        console.error('Error updating shipment:', error);
        res.status(500).json({ message: 'Error al actualizar embarque' });
    }
};

/**
 * @route   GET /api/shipments/monthly-close
 * @desc    Cierre mensual: agrega D2D (CBM) y FCL (contenedores) por cliente y vendedor
 * @query   month=YYYY-MM (default: mes actual)
 */
export const getMonthlyClose = async (req, res) => {
    try {
        const { month } = req.query;

        // Calcular rango de fechas del mes
        const now = new Date();
        const [year, mon] = month
            ? month.split('-').map(Number)
            : [now.getFullYear(), now.getMonth() + 1];

        const start = new Date(year, mon - 1, 1);
        const end = new Date(year, mon, 1);

        // Obtener todos los usuarios ADMIN + SALES activos
        const users = await prisma.user.findMany({
            where: { isActive: true, role: { in: ['ADMIN', 'SALES'] } },
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' }
        });

        // --- D2D: embarques D2D del mes con cbm ---
        const d2dShipments = await prisma.shipment.findMany({
            where: {
                type: 'D2D',
                deletedAt: null,
                createdAt: { gte: start, lt: end }
            },
            select: {
                clientId: true,
                clientName: true,
                vendedorId: true,
                cbm: true
            }
        });

        // Agrupar D2D por cliente
        const d2dMap = {};
        for (const s of d2dShipments) {
            const key = s.clientId || s.clientName || 'SIN_CLIENTE';
            const label = s.clientName || key;
            if (!d2dMap[key]) {
                d2dMap[key] = { clientId: s.clientId, clientName: label, cbmByUser: {} };
                for (const u of users) d2dMap[key].cbmByUser[u.id] = 0;
            }
            if (s.vendedorId) {
                d2dMap[key].cbmByUser[s.vendedorId] =
                    parseFloat(d2dMap[key].cbmByUser[s.vendedorId] || 0) +
                    parseFloat(s.cbm || 0);
            }
        }

        const d2d = Object.values(d2dMap).sort((a, b) =>
            a.clientName.localeCompare(b.clientName)
        );

        // Totales por vendedor (D2D)
        const d2dTotals = {};
        for (const u of users) d2dTotals[u.id] = 0;
        let d2dGrand = 0;
        for (const row of d2d) {
            for (const uid of Object.keys(row.cbmByUser)) {
                d2dTotals[uid] = parseFloat((d2dTotals[uid] || 0)) + parseFloat(row.cbmByUser[uid] || 0);
                d2dGrand += parseFloat(row.cbmByUser[uid] || 0);
            }
        }
        // Redondear
        for (const uid of Object.keys(d2dTotals)) {
            d2dTotals[uid] = parseFloat(d2dTotals[uid].toFixed(2));
        }
        d2dGrand = parseFloat(d2dGrand.toFixed(2));

        // --- FCL: embarques FCL del mes con contenedores ---
        const fclShipments = await prisma.shipment.findMany({
            where: {
                type: 'FCL',
                deletedAt: null,
                createdAt: { gte: start, lt: end }
            },
            select: {
                clientId: true,
                clientName: true,
                vendedorId: true,
                containers: { select: { containerType: true, quantity: true } }
            }
        });

        const CONTAINER_TYPES = ['20ft', '40ft', '40HC'];

        // Agrupar FCL por cliente
        const fclMap = {};
        for (const s of fclShipments) {
            const key = s.clientId || s.clientName || 'SIN_CLIENTE';
            const label = s.clientName || key;
            if (!fclMap[key]) {
                fclMap[key] = { clientId: s.clientId, clientName: label, containersByUser: {} };
                for (const u of users) {
                    fclMap[key].containersByUser[u.id] = { '20ft': 0, '40ft': 0, '40HC': 0 };
                }
            }
            if (s.vendedorId) {
                for (const c of s.containers) {
                    const ct = c.containerType;
                    if (CONTAINER_TYPES.includes(ct)) {
                        fclMap[key].containersByUser[s.vendedorId][ct] =
                            (fclMap[key].containersByUser[s.vendedorId][ct] || 0) + (c.quantity || 1);
                    }
                }
            }
        }

        const fcl = Object.values(fclMap).sort((a, b) =>
            a.clientName.localeCompare(b.clientName)
        );

        // Totales por vendedor (FCL)
        const fclTotals = {};
        for (const u of users) fclTotals[u.id] = { '20ft': 0, '40ft': 0, '40HC': 0 };
        const fclGrand = { '20ft': 0, '40ft': 0, '40HC': 0 };

        for (const row of fcl) {
            for (const uid of Object.keys(row.containersByUser)) {
                for (const ct of CONTAINER_TYPES) {
                    fclTotals[uid][ct] += row.containersByUser[uid][ct] || 0;
                    fclGrand[ct] += row.containersByUser[uid][ct] || 0;
                }
            }
        }

        res.json({
            month: `${year}-${String(mon).padStart(2, '0')}`,
            users,
            d2d,
            d2dTotals,
            d2dGrand,
            fcl,
            fclTotals,
            fclGrand
        });

    } catch (error) {
        console.error('Error getting monthly close:', error);
        res.status(500).json({ message: 'Error al generar cierre mensual' });
    }
};

/**
 * @route   DELETE /api/shipments/:id
 * @desc    Eliminar un embarque
 */
export const deleteShipment = async (req, res) => {
    try {
        await prisma.shipment.update({
            where: { id: req.params.id },
            data: { deletedAt: new Date() }
        });
        res.json({ message: 'Embarque eliminado (soft delete)' });
    } catch (error) {
        console.error('Error deleting shipment:', error);
        res.status(500).json({ message: 'Error al eliminar embarque' });
    }
};
