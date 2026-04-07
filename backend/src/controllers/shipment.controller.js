import prisma from '../config/database.js';
import { createNotification } from './notification.controller.js';

/**
 * @route   GET /api/shipments
 * @desc    Listar todos los embarques con filtros
 */
export const getShipments = async (req, res) => {
    try {
        const { search, type, status } = req.query;

        const where = {};

        if (type) where.type = type;
        if (status) where.status = status;

        if (search) {
            where.OR = [
                { blNumber: { contains: search, mode: 'insensitive' } },
                { bookingNumber: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { shippingLineRel: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const shipments = await prisma.shipment.findMany({
            where,
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
            shippingLineId, clientId, clientName,
            vendedorId, currentLocation,
            containerType, containerQty, originPort, destPort, etd, eta,
            weight, quantity, cbm
        } = req.body;

        if (!type) {
            return res.status(400).json({ message: 'El tipo de embarque es requerido (FCL o D2D)' });
        }

        // Normalizar: string vacío → null para evitar error de FK en Prisma
        const noticeId = paymentNoticeId || null;
        const resolvedClientId = clientId || null;
        const resolvedShippingLineId = shippingLineId || null;

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
            clientId: resolvedClientId,
            clientName: clientName || notice?.client?.name || null,
            vendedorId: vendedorId || null,
            currentLocation: currentLocation || null,
            updatedById: req.user.id,
        };

        // Vincular al aviso si se proveyó
        if (noticeId) data.paymentNoticeId = noticeId;


        // FCL fields
        if (type === 'FCL') {
            data.containerType = containerType || null;
            data.containerQty = containerQty ? parseInt(containerQty) : null;
            data.originPort = originPort || null;
            data.destPort = destPort || null;
            data.etd = etd ? new Date(etd) : null;
            data.eta = eta ? new Date(eta) : null;
        }

        // D2D fields
        if (type === 'D2D') {
            data.weight = weight ? parseFloat(weight) : null;
            data.quantity = quantity ? parseInt(quantity) : null;
            data.cbm = cbm ? parseFloat(cbm) : null;
            data.originPort = originPort || null;
        }

        const shipment = await prisma.shipment.create({
            data,
            include: {
                paymentNotice: { select: { number: true, client: { select: { name: true } } } },
                vendedor: { select: { id: true, name: true } },
                shippingLineRel: { select: { id: true, name: true } },
                clientRel: { select: { id: true, name: true } },
            }
        });

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
            blNumber, whNumber, bookingNumber, shippingLineId, status,
            clientId, clientName, vendedorId, currentLocation,
            containerType, containerQty, originPort, destPort, etd, eta,
            weight, quantity, cbm
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
        if (status !== undefined) data.status = status;
        if (clientName !== undefined) data.clientName = clientName || null;
        if (vendedorId !== undefined) data.vendedorId = vendedorId || null;
        if (currentLocation !== undefined) data.currentLocation = currentLocation || null;
        if (containerType !== undefined) data.containerType = containerType || null;
        if (containerQty !== undefined) data.containerQty = containerQty ? parseInt(containerQty) : null;
        if (originPort !== undefined) data.originPort = originPort || null;
        if (destPort !== undefined) data.destPort = destPort || null;
        if (etd !== undefined) data.etd = etd ? new Date(etd) : null;
        if (eta !== undefined) data.eta = eta ? new Date(eta) : null;
        if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
        if (quantity !== undefined) data.quantity = quantity ? parseInt(quantity) : null;
        if (cbm !== undefined) data.cbm = cbm ? parseFloat(cbm) : null;

        const shipment = await prisma.shipment.update({
            where: { id },
            data,
            include: {
                paymentNotice: { select: { number: true, client: { select: { name: true } } } },
                vendedor: { select: { id: true, name: true } },
                shippingLineRel: { select: { id: true, name: true } },
                clientRel: { select: { id: true, name: true } },
            }
        });

        if (status !== undefined && existing.status !== status) {
            const statusTranslations = {
                PENDING: 'Pendiente',
                AT_ORIGIN_WAREHOUSE: 'En Almacén Origen',
                ON_VESSEL: 'En Tránsito',
                AT_DESTINATION_PORT: 'En Puerto Destino',
                CUSTOMS_CLEARANCE: 'En Aduana',
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
 * @route   DELETE /api/shipments/:id
 * @desc    Eliminar un embarque
 */
export const deleteShipment = async (req, res) => {
    try {
        await prisma.shipment.delete({ where: { id: req.params.id } });
        res.json({ message: 'Embarque eliminado' });
    } catch (error) {
        console.error('Error deleting shipment:', error);
        res.status(500).json({ message: 'Error al eliminar embarque' });
    }
};
