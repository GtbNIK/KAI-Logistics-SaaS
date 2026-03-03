import prisma from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../config/upload.js';

/**
 * Obtener la configuración de la empresa
 */
export const getSettings = async (req, res) => {
    try {
        const settings = await prisma.companySettings.findFirst();
        
        if (!settings) {
            return res.status(404).json({ 
                message: 'Configuración de empresa no encontrada' 
            });
        }

        /* HABILITAR ESTO SOLO SI NO QUIEREN QUE LOS USUARIOS CON ROL VENTAS VEAN LOS DATOS BANCARIOS DE LA EMPRESA

        // Si NO es admin, devolver solo datos de tema visual (lo mínimo necesario)
        if (req.user.role !== 'ADMIN') {
            return res.json({
                id: settings.id,
                companyName: settings.companyName,
                rif: settings.rif,
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                logoUrl: settings.logoUrl,
                headerText: settings.headerText,
                footerText: settings.footerText,
                quoteBgUrl: settings.quoteBgUrl,
                noticeBgUrl: settings.noticeBgUrl
            });
        } 
        */
        
        // Admin recibe todo
        res.json(settings);
    } catch (error) {
        console.error('Error fetching company settings:', error);
        res.status(500).json({ message: 'Error al obtener configuración' });
    }
};

/**
 * Actualizar la configuración de la empresa
 * Acepta tanto JSON (campos de texto) como multipart/form-data (con imágenes)
 */
export const updateSettings = async (req, res) => {
    try {
        const { companyName, rif, primaryColor, secondaryColor, headerText, footerText, logoUrl, paymentInfo } = req.body;
        
        const existing = await prisma.companySettings.findFirst();
        
        if (!existing) {
            return res.status(404).json({ message: 'Configuración no encontrada' });
        }

        // Construir objeto de datos a actualizar
        const data = {
            companyName,
            rif,
            primaryColor,
            secondaryColor,
            headerText,
            footerText,
            logoUrl,
            paymentInfo
        };

        // Procesar archivos subidos (si los hay)
        if (req.files) {
            // Fondo de cotización
            if (req.files.quoteBg?.[0]) {
                // Borrar archivo anterior si existe
                deleteOldFile(existing.quoteBgUrl);
                data.quoteBgUrl = `/uploads/backgrounds/${req.files.quoteBg[0].filename}`;
            }
            // Fondo de aviso de cobro
            if (req.files.noticeBg?.[0]) {
                deleteOldFile(existing.noticeBgUrl);
                data.noticeBgUrl = `/uploads/backgrounds/${req.files.noticeBg[0].filename}`;
            }
            // Fondo de nota de entrega
            if (req.files.deliveryNoteBg?.[0]) {
                deleteOldFile(existing.deliveryNoteBgUrl);
                data.deliveryNoteBgUrl = `/uploads/backgrounds/${req.files.deliveryNoteBg[0].filename}`;
            }
        }

        // Comprobar si se solicita eliminar una imagen (sin reemplazar)
        if (req.body.removeQuoteBg === 'true') {
            deleteOldFile(existing.quoteBgUrl);
            data.quoteBgUrl = null;
        }
        if (req.body.removeNoticeBg === 'true') {
            deleteOldFile(existing.noticeBgUrl);
            data.noticeBgUrl = null;
        }
        if (req.body.removeDeliveryNoteBg === 'true') {
            deleteOldFile(existing.deliveryNoteBgUrl);
            data.deliveryNoteBgUrl = null;
        }

        const updated = await prisma.companySettings.update({
            where: { id: existing.id },
            data
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({ message: 'Error al actualizar configuración' });
    }
};

/**
 * Elimina un archivo antiguo del disco
 */
function deleteOldFile(fileUrl) {
    if (!fileUrl) return;
    try {
        // fileUrl es algo como "/uploads/backgrounds/quote-123456.jpg"
        const relativePath = fileUrl.replace('/uploads/', '');
        const fullPath = path.join(UPLOADS_DIR, relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    } catch (err) {
        console.warn('No se pudo eliminar archivo antiguo:', err.message);
    }
}
