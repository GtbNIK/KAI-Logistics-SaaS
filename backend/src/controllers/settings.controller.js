import prisma from '../lib/prisma.js';
import { supabase, BACKGROUNDS_BUCKET } from '../lib/supabase.js';

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

        // Procesar archivos subidos (si los hay) - usando Supabase Storage
        if (req.files) {
            // Fondo de cotización
            if (req.files.quoteBg?.[0]) {
                // Borrar archivo anterior si existe
                await deleteOldFileFromStorage(existing.quoteBgUrl);
                data.quoteBgUrl = await uploadToStorage(req.files.quoteBg[0], 'quote');
            }
            // Fondo de aviso de cobro
            if (req.files.noticeBg?.[0]) {
                await deleteOldFileFromStorage(existing.noticeBgUrl);
                data.noticeBgUrl = await uploadToStorage(req.files.noticeBg[0], 'notice');
            }
            // Fondo de nota de entrega
            if (req.files.deliveryNoteBg?.[0]) {
                await deleteOldFileFromStorage(existing.deliveryNoteBgUrl);
                data.deliveryNoteBgUrl = await uploadToStorage(req.files.deliveryNoteBg[0], 'delivery-note');
            }
            // Fondo de recibo de pago
            if (req.files.receiptBg?.[0]) {
                await deleteOldFileFromStorage(existing.receiptBgUrl);
                data.receiptBgUrl = await uploadToStorage(req.files.receiptBg[0], 'receipt');
            }
            // Fondo de tarifas
            if (req.files.rateBg?.[0]) {
                await deleteOldFileFromStorage(existing.rateBgUrl);
                data.rateBgUrl = await uploadToStorage(req.files.rateBg[0], 'rate');
            }
        }

        // Comprobar si se solicita eliminar una imagen (sin reemplazar)
        if (req.body.removeQuoteBg === 'true') {
            await deleteOldFileFromStorage(existing.quoteBgUrl);
            data.quoteBgUrl = null;
        }
        if (req.body.removeNoticeBg === 'true') {
            await deleteOldFileFromStorage(existing.noticeBgUrl);
            data.noticeBgUrl = null;
        }
        if (req.body.removeDeliveryNoteBg === 'true') {
            await deleteOldFileFromStorage(existing.deliveryNoteBgUrl);
            data.deliveryNoteBgUrl = null;
        }
        if (req.body.removeReceiptBg === 'true') {
            await deleteOldFileFromStorage(existing.receiptBgUrl);
            data.receiptBgUrl = null;
        }
        if (req.body.removeRateBg === 'true') {
            await deleteOldFileFromStorage(existing.rateBgUrl);
            data.rateBgUrl = null;
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
 * Sube un archivo a Supabase Storage
 */
async function uploadToStorage(file, prefix) {
    try {
        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${prefix}-${timestamp}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from(BACKGROUNDS_BUCKET)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });
        
        if (error) {
            console.error('Error uploading to Supabase:', error);
            throw error;
        }
        
        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
            .from(BACKGROUNDS_BUCKET)
            .getPublicUrl(fileName);
        
        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Error uploading file:', err);
        throw new Error('Error al subir imagen al storage');
    }
}

/**
 * Elimina un archivo antiguo de Supabase Storage
 */
async function deleteOldFileFromStorage(fileUrl) {
    if (!fileUrl) return;
    try {
        // Si es URL de Supabase, extraer el nombre del archivo
        if (fileUrl.includes('supabase.co')) {
            const url = new URL(fileUrl);
            const pathParts = url.pathname.split('/');
            const fileName = pathParts[pathParts.length - 1];
            
            const { error } = await supabase.storage
                .from(BACKGROUNDS_BUCKET)
                .remove([fileName]);
            
            if (error) {
                console.warn('No se pudo eliminar archivo de Supabase:', error.message);
            }
        }
    } catch (err) {
        console.warn('No se pudo eliminar archivo antiguo:', err.message);
    }
}

/**
 * @deprecated Función legacy para eliminar archivos del disco local
 */
function deleteOldFile(fileUrl) {
    // Ya no se usa - los archivos ahora están en Supabase Storage
    console.log('deleteOldFile es deprecated, use deleteOldFileFromStorage');
}
