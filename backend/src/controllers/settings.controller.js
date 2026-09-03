import prisma from '../config/database.js';
import { supabase, BACKGROUNDS_BUCKET, LOGOS_BUCKET } from '../lib/supabase.js';
import { uploadTenantFile, deleteTenantFile } from '../services/storage.service.js';

/**
 * Obtener la configuración de la empresa
 */
export const getSettings = async (req, res) => {
    try {
        // Defensa en profundidad: where explicito por tenant (no depender solo de la extension Prisma)
        const settings = await prisma.companySettings.findUnique({
            where: { tenantId: req.tenant.id },
        });
        
        if (!settings) {
            return res.status(404).json({ 
                message: 'Configuración de empresa no encontrada' 
            });
        }

        /* HABILITAR ESTO SOLO SI NO QUIEREN QUE LOS USUARIOS CON ROL VENTAS VEAN LOS DATOS BANCARIOS DE LA EMPRESA

        // Si NO es admin, devolver solo datos de tema visual (lo mínimo necesario)
        if (req.membership.role !== 'ADMIN') {
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
        const { companyName, rif, primaryColor, secondaryColor, headerText, footerText, logoUrl, paymentInfo, companyAddress, companyPhone } = req.body;
        
        // Defensa en profundidad: where explicito por tenant (evita pisar la config de otro tenant)
        const existing = await prisma.companySettings.findUnique({
            where: { tenantId: req.tenant.id },
        });
        
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
            paymentInfo,
            companyAddress,
            companyPhone,
        };

        const hasFilesToUpload = Boolean(
            req.files?.logo?.[0] ||
            req.files?.quoteBg?.[0] ||
            req.files?.noticeBg?.[0] ||
            req.files?.deliveryNoteBg?.[0] ||
            req.files?.receiptBg?.[0] ||
            req.files?.rateBg?.[0]
        );

        const hasFilesToRemove = [
            req.body.removeLogo,
            req.body.removeQuoteBg,
            req.body.removeNoticeBg,
            req.body.removeDeliveryNoteBg,
            req.body.removeReceiptBg,
            req.body.removeRateBg
        ].some(value => value === 'true');

        if (!supabase && (hasFilesToUpload || hasFilesToRemove)) {
            return res.status(400).json({
                message: 'Supabase Storage no está configurado en este entorno'
            });
        }

        // Procesar archivos subidos (si los hay) - usando Supabase Storage
        if (req.files) {
            // Logo de la empresa
            if (req.files.logo?.[0]) {
                await deleteTenantFile(existing.logoUrl, { tenantId: req.tenant.id, bucket: LOGOS_BUCKET });
                data.logoUrl = await uploadTenantFile(req.files.logo[0], { tenantId: req.tenant.id, prefix: 'logo', bucket: LOGOS_BUCKET });
            }

            // Fondo de cotización
            if (req.files.quoteBg?.[0]) {
                // Borrar archivo anterior si existe
                await deleteTenantFile(existing.quoteBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
                data.quoteBgUrl = await uploadTenantFile(req.files.quoteBg[0], { tenantId: req.tenant.id, prefix: 'quote', bucket: BACKGROUNDS_BUCKET });
            }
            // Fondo de aviso de cobro
            if (req.files.noticeBg?.[0]) {
                await deleteTenantFile(existing.noticeBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
                data.noticeBgUrl = await uploadTenantFile(req.files.noticeBg[0], { tenantId: req.tenant.id, prefix: 'notice', bucket: BACKGROUNDS_BUCKET });
            }
            // Fondo de nota de entrega
            if (req.files.deliveryNoteBg?.[0]) {
                await deleteTenantFile(existing.deliveryNoteBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
                data.deliveryNoteBgUrl = await uploadTenantFile(req.files.deliveryNoteBg[0], { tenantId: req.tenant.id, prefix: 'delivery-note', bucket: BACKGROUNDS_BUCKET });
            }
            // Fondo de recibo de pago
            if (req.files.receiptBg?.[0]) {
                await deleteTenantFile(existing.receiptBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
                data.receiptBgUrl = await uploadTenantFile(req.files.receiptBg[0], { tenantId: req.tenant.id, prefix: 'receipt', bucket: BACKGROUNDS_BUCKET });
            }
            // Fondo de tarifas
            if (req.files.rateBg?.[0]) {
                await deleteTenantFile(existing.rateBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
                data.rateBgUrl = await uploadTenantFile(req.files.rateBg[0], { tenantId: req.tenant.id, prefix: 'rate', bucket: BACKGROUNDS_BUCKET });
            }
        }

        // Comprobar si se solicita eliminar una imagen (sin reemplazar)
        if (req.body.removeLogo === 'true') {
            await deleteTenantFile(existing.logoUrl, { tenantId: req.tenant.id, bucket: LOGOS_BUCKET });
            data.logoUrl = null;
        }
        if (req.body.removeQuoteBg === 'true') {
            await deleteTenantFile(existing.quoteBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
            data.quoteBgUrl = null;
        }
        if (req.body.removeNoticeBg === 'true') {
            await deleteTenantFile(existing.noticeBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
            data.noticeBgUrl = null;
        }
        if (req.body.removeDeliveryNoteBg === 'true') {
            await deleteTenantFile(existing.deliveryNoteBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
            data.deliveryNoteBgUrl = null;
        }
        if (req.body.removeReceiptBg === 'true') {
            await deleteTenantFile(existing.receiptBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
            data.receiptBgUrl = null;
        }
        if (req.body.removeRateBg === 'true') {
            await deleteTenantFile(existing.rateBgUrl, { tenantId: req.tenant.id, bucket: BACKGROUNDS_BUCKET });
            data.rateBgUrl = null;
        }

        // Defensa en profundidad: where explicito por tenant en el update
        const updated = await prisma.companySettings.update({
            where: { tenantId: req.tenant.id },
            data
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({ message: 'Error al actualizar configuración' });
    }
};

/**
 * @deprecated Función legacy para eliminar archivos del disco local
 */
function deleteOldFile(fileUrl) {
    // Ya no se usa - los archivos ahora están en el storage service
    console.log('deleteOldFile es deprecated, use deleteTenantFile de services/storage.service.js');
}
