import { PrismaClient } from '@prisma/client';

// Usar global.prisma si ya existe para evitar múltiples conexiones en dev
const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Generar código interno automático (ej. CLI-0001)
const generateInternalCode = async () => {
    const lastClient = await prisma.client.findFirst({
        orderBy: { internalCode: 'desc' }
    });
    
    if (!lastClient) return 'CLI-0001';
    
    const lastNumber = parseInt(lastClient.internalCode.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `CLI-${nextNumber.toString().padStart(4, '0')}`;
};

export const createClient = async (req, res) => {
    try {
        const { name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint } = req.body;
        
        // Verificar duplicados
        const existingClient = await prisma.client.findFirst({
            where: { 
                OR: [{ rifOrId }, { email }]
            }
        });

        if (existingClient) {
            return res.status(400).json({ message: 'El cliente ya existe (RIF o Email duplicado)' });
        }

        const internalCode = await generateInternalCode();
        
        // Si es VENDEDOR, se asigna automáticamente a sí mismo.
        const assignedToId = req.user.id; 

        const client = await prisma.client.create({
            data: {
                internalCode,
                name,
                rifOrId,
                email,
                phone,
                address,
                deliveryAddress,
                contactPerson,
                referencePoint,
                assignedToId
            }
        });

        res.status(201).json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ message: 'Error al crear cliente' });
    }
};

export const getClients = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', all = 'false' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const isSales = req.user.role === 'SALES';

        // Filtro de búsqueda
        const where = {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { internalCode: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } }
            ]
        };

        if (isSales) {
            where.assignedToId = req.user.id;
        }

        // Si all=true, devolver sin paginación (para selects)
        if (all === 'true') {
             const clients = await prisma.client.findMany({
                where,
                orderBy: { name: 'asc' },
                include: { assignedTo: { select: { name: true, email: true } } }
            });
            return res.json({ data: clients });
        }

        // Conteo total para paginación
        const total = await prisma.client.count({ where });

        const clients = await prisma.client.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedTo: {
                    select: { name: true, email: true }
                }
            }
        });

        res.json({
            data: clients,
            meta: {
                total,
                page: parseInt(page),
                last_page: Math.ceil(total / take)
            }
        });
    } catch (error) {
        console.error('Error getting clients:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};

export const getClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await prisma.client.findUnique({
            where: { id },
            include: { assignedTo: true }
        });

        if (!client) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Seguridad: Si es ventas, verificar que sea suyo
        if (req.user.role === 'SALES' && client.assignedToId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para ver este cliente' });
        }

        res.json(client);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener cliente' });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint } = req.body;

        const existingClient = await prisma.client.findUnique({ where: { id } });
        if (!existingClient) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        // Seguridad
        if (req.user.role === 'SALES' && existingClient.assignedToId !== req.user.id) {
            return res.status(403).json({ message: 'No tienes permiso para editar este cliente' });
        }

        const updatedClient = await prisma.client.update({
            where: { id },
            data: {
                name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint
            }
        });

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error al actualizar cliente' });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Solo administradores pueden eliminar clientes' });
        }

        await prisma.client.delete({ where: { id } });
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
};
