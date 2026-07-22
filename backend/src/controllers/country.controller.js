import prisma from '../config/database.js';

/**
 * @route   GET /api/countries
 * @desc    Listar todos los países
 * @access  Private
 */
export const getCountries = async (req, res) => {
    try {
        const countries = await prisma.country.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(countries);
    } catch (error) {
        console.error('Error in getCountries:', error);
        res.status(500).json({ message: 'Error al obtener países' });
    }
};

/**
 * @route   POST /api/countries
 * @desc    Crear un nuevo país
 * @access  Private (ADMIN only)
 */
export const createCountry = async (req, res) => {
    try {
        const { name, code } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'El nombre del país es requerido' });
        }

        const existing = await prisma.country.findFirst({
            where: { name }
        });

        if (existing) {
            return res.status(400).json({ message: 'Ya existe un país con ese nombre' });
        }

        const country = await prisma.country.create({
            data: {
                name: name.trim(),
                code: code?.trim() || null
            }
        });

        res.status(201).json(country);
    } catch (error) {
        console.error('Error in createCountry:', error);
        res.status(500).json({ message: 'Error al crear país', error: error.message });
    }
};
