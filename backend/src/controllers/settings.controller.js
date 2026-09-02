import prisma from '../config/database.js';
import { supabase, BACKGROUNDS_BUCKET, LOGOS_BUCKET } from '../lib/supabase.js';

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
                await deleteOldLogoFromStorage(existing.logoUrl, req.tenant.id);
                data.logoUrl = await uploadToStorage(req.files.logo[0], 'logo', LOGOS_BUCKET, req.tenant.id);
            }

            // Fondo de cotización
            if (req.files.quoteBg?.[0]) {
                // Borrar archivo anterior si existe
                await deleteOldFileFromStorage(existing.quoteBgUrl, req.tenant.id);
                data.quoteBgUrl = await uploadToStorage(req.files.quoteBg[0], 'quote', BACKGROUNDS_BUCKET, req.tenant.id);
            }
            // Fondo de aviso de cobro
            if (req.files.noticeBg?.[0]) {
                await deleteOldFileFromStorage(existing.noticeBgUrl, req.tenant.id);
                data.noticeBgUrl = await uploadToStorage(req.files.noticeBg[0], 'notice', BACKGROUNDS_BUCKET, req.tenant.id);
            }
            // Fondo de nota de entrega
            if (req.files.deliveryNoteBg?.[0]) {
                await deleteOldFileFromStorage(existing.deliveryNoteBgUrl, req.tenant.id);
                data.deliveryNoteBgUrl = await uploadToStorage(req.files.deliveryNoteBg[0], 'delivery-note', BACKGROUNDS_BUCKET, req.tenant.id);
            }
            // Fondo de recibo de pago
            if (req.files.receiptBg?.[0]) {
                await deleteOldFileFromStorage(existing.receiptBgUrl, req.tenant.id);
                data.receiptBgUrl = await uploadToStorage(req.files.receiptBg[0], 'receipt', BACKGROUNDS_BUCKET, req.tenant.id);
            }
            // Fondo de tarifas
            if (req.files.rateBg?.[0]) {
                await deleteOldFileFromStorage(existing.rateBgUrl, req.tenant.id);
                data.rateBgUrl = await uploadToStorage(req.files.rateBg[0], 'rate', BACKGROUNDS_BUCKET, req.tenant.id);
            }
        }

        // Comprobar si se solicita eliminar una imagen (sin reemplazar)
        if (req.body.removeLogo === 'true') {
            await deleteOldLogoFromStorage(existing.logoUrl, req.tenant.id);
            data.logoUrl = null;
        }
        if (req.body.removeQuoteBg === 'true') {
            await deleteOldFileFromStorage(existing.quoteBgUrl, req.tenant.id);
            data.quoteBgUrl = null;
        }
        if (req.body.removeNoticeBg === 'true') {
            await deleteOldFileFromStorage(existing.noticeBgUrl, req.tenant.id);
            data.noticeBgUrl = null;
        }
        if (req.body.removeDeliveryNoteBg === 'true') {
            await deleteOldFileFromStorage(existing.deliveryNoteBgUrl, req.tenant.id);
            data.deliveryNoteBgUrl = null;
        }
        if (req.body.removeReceiptBg === 'true') {
            await deleteOldFileFromStorage(existing.receiptBgUrl, req.tenant.id);
            data.receiptBgUrl = null;
        }
        if (req.body.removeRateBg === 'true') {
            await deleteOldFileFromStorage(existing.rateBgUrl, req.tenant.id);
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
 * Extrae el path relativo del archivo dentro del bucket desde una URL publica de Supabase.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/backgrounds/tenants/1/logo-1.png
 *     -> "tenants/1/logo-1.png"
 * Devuelve null si la URL no corresponde al bucket indicado.
 */
function extractStoragePath(fileUrl, bucketName) {
    try {
        const url = new URL(fileUrl);
        const marker = `/object/public/${bucketName}/`;
        const idx = url.pathname.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(url.pathname.substring(idx + marker.length));
    } catch {
        return null;
    }
}

/**
 * Sube un archivo a Supabase Storage bajo el namespace del tenant activo.
 * Ruta final: tenants/{tenantId}/{prefix}-{timestamp}.{ext}
 */
async function uploadToStorage(file, prefix, bucketName, tenantId) {
    if (!supabase) {
        throw new Error('Supabase Storage no está configurado');
    }

    try {
        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        // Namespace por tenant: aísla los archivos y permite restringir borrados al propio tenant
        const fileName = `tenants/${tenantId}/${prefix}-${timestamp}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from(bucketName)
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
            .from(bucketName)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Error uploading file:', err);
        throw new Error('Error al subir imagen al storage');
    }
}

/**
 * Elimina un logo antiguo de Supabase Storage (bucket logos).
 * Solo borra archivos del propio tenant (namespace "tenants/{tenantId}/")
 * o archivos legacy planos (sin carpeta), que vienen de la fila del tenant activo.
 */
async function deleteOldLogoFromStorage(fileUrl, tenantId) {
    if (!supabase || !fileUrl) return;
    try {
        if (fileUrl.includes('supabase.co')) {
            const filePath = extractStoragePath(fileUrl, LOGOS_BUCKET);
            if (!filePath) return;

            // Archivos con namespace: solo borrar si pertenecen al tenant activo
            const isTenantScoped = filePath.startsWith(`tenants/${tenantId}/`);
            // Archivos legacy planos (formato "logo-{ts}.{ext}" sin carpeta)
            const isLegacyFlat = !filePath.includes('/');
            if (!isTenantScoped && !isLegacyFlat) {
                console.warn('Se omitió el borrado de un archivo fuera del namespace del tenant activo:', filePath);
                return;
            }

            const { error } = await supabase.storage
                .from(LOGOS_BUCKET)
                .remove([filePath]);

            if (error) {
                console.warn('No se pudo eliminar logo antiguo de Supabase:', error.message);
            }
        }
    } catch (err) {
        console.warn('No se pudo eliminar logo antiguo:', err.message);
    }
}

/**
 * Elimina un archivo antiguo de Supabase Storage.
 * Solo borra archivos del propio tenant (namespace "tenants/{tenantId}/")
 * o archivos legacy planos (sin carpeta), que vienen de la fila del tenant activo.
 */
async function deleteOldFileFromStorage(fileUrl, tenantId) {
    if (!supabase || !fileUrl) return;
    try {
        // Si es URL de Supabase, extraer el path relativo al bucket
        if (fileUrl.includes('supabase.co')) {
            const filePath = extractStoragePath(fileUrl, BACKGROUNDS_BUCKET);
            if (!filePath) return;

            // Archivos con namespace: solo borrar si pertenecen al tenant activo
            const isTenantScoped = filePath.startsWith(`tenants/${tenantId}/`);
            // Archivos legacy planos (formato "{prefix}-{ts}.{ext}" sin carpeta)
            const isLegacyFlat = !filePath.includes('/');
            if (!isTenantScoped && !isLegacyFlat) {
                console.warn('Se omitió el borrado de un archivo fuera del namespace del tenant activo:', filePath);
                return;
            }

            const { error } = await supabase.storage
                .from(BACKGROUNDS_BUCKET)
                .remove([filePath]);

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
