import prisma from '../lib/prisma.js';

/**
 * Obtener la configuración de la empresa
 */
export const getSettings = async (req, res) => {
    try {
        // Obtener la primera (y única) configuración de empresa
        const settings = await prisma.companySettings.findFirst();
        
        if (!settings) {
            return res.status(404).json({ 
                message: 'Configuración de empresa no encontrada' 
            });
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching company settings:', error);
        res.status(500).json({ message: 'Error al obtener configuración' });
    }
};

/**
 * Actualizar la configuración de la empresa
 */
export const updateSettings = async (req, res) => {
    try {
        const { companyName, rif, primaryColor, secondaryColor, headerText, footerText, logoUrl } = req.body;
        
        // Obtener el registro existente
        const existing = await prisma.companySettings.findFirst();
        
        if (!existing) {
            return res.status(404).json({ 
                message: 'Configuración no encontrada' 
            });
        }
        
        const updated = await prisma.companySettings.update({
            where: { id: existing.id },
            data: {
                companyName,
                rif,
                primaryColor,
                secondaryColor,
                headerText,
                footerText,
                logoUrl
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({ message: 'Error al actualizar configuración' });
    }
};
