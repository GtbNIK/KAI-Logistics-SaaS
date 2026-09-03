/**
 * storage.service - Capa de servicio para Supabase Storage.
 *
 * Encapsula todo el conocimiento sobre la estructura del bucket:
 * - Namespace por tenant: tenants/{tenantId}/{prefix}-{timestamp}.{ext}
 * - Compatibilidad con archivos legacy planos ({prefix}-{timestamp}.{ext})
 * - Restriccion de borrados al namespace del tenant activo (defensa en profundidad)
 *
 * El controlador solo orquesta HTTP + logica de negocio; aqui vive el detalle
 * tecnico de subida/borrado (SRP).
 */

import { supabase } from '../lib/supabase.js';

/**
 * Extrae el path relativo del archivo dentro del bucket desde una URL publica de Supabase.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/backgrounds/tenants/1/logo-1.png
 *     -> "tenants/1/logo-1.png"
 *
 * Bloquea path traversal: si el path decodificado contiene "..", devuelve null.
 * Devuelve null si la URL no corresponde al bucket indicado.
 *
 * @param {string} fileUrl URL publica del archivo
 * @param {string} bucketName Nombre del bucket
 * @returns {string|null} Path relativo dentro del bucket, o null si no es valido
 */
function extractStoragePath(fileUrl, bucketName) {
    try {
        const url = new URL(fileUrl);
        const marker = `/object/public/${bucketName}/`;
        const idx = url.pathname.indexOf(marker);
        if (idx === -1) return null;
        const decoded = decodeURIComponent(url.pathname.substring(idx + marker.length));
        // Bloquear path traversal: nunca resolver rutas con ".."
        if (decoded.includes('..')) return null;
        // Whitelist estricta de caracteres: solo lo que generamos al subir
        // (alfanumericos, punto, guion, slash). Rechaza doble-encoding (%2e, %252e, etc.)
        if (/[^a-zA-Z0-9._/-]/.test(decoded)) return null;
        return decoded;
    } catch {
        return null;
    }
}

/**
 * Sube un archivo a Supabase Storage bajo el namespace del tenant activo.
 * Ruta final: tenants/{tenantId}/{prefix}-{timestamp}.{ext}
 *
 * @param {object} file Archivo de multer (buffer, originalname, mimetype)
 * @param {object} options
 * @param {string} options.tenantId ID del tenant activo (namespace de aislamiento)
 * @param {string} options.prefix Prefijo logico del archivo (logo, quote, notice, ...)
 * @param {string} options.bucket Nombre del bucket destino
 * @returns {Promise<string>} URL publica del archivo subido
 */
export async function uploadTenantFile(file, { tenantId, prefix, bucket }) {
    if (!supabase) {
        throw new Error('Supabase Storage no está configurado');
    }

    try {
        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        // Namespace por tenant: aísla los archivos y permite restringir borrados al propio tenant
        const fileName = `tenants/${tenantId}/${prefix}-${timestamp}.${fileExt}`;

        const { error } = await supabase.storage
            .from(bucket)
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
            .from(bucket)
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Error uploading file:', err);
        throw new Error('Error al subir imagen al storage');
    }
}

/**
 * Elimina un archivo de Supabase Storage de forma segura.
 * Solo borra:
 * 1. Archivos del propio tenant (namespace "tenants/{tenantId}/")
 * 2. Archivos legacy planos (sin carpeta), que provienen de la fila
 *    del tenant activo (garantizado por el where explicito del controlador)
 * Cualquier otro path se omite con un warning (nunca toca archivos ajenos).
 *
 * @param {string|null} fileUrl URL publica del archivo a eliminar
 * @param {object} options
 * @param {string} options.tenantId ID del tenant activo
 * @param {string} options.bucket Nombre del bucket donde vive el archivo
 * @returns {Promise<void>}
 */
export async function deleteTenantFile(fileUrl, { tenantId, bucket }) {
    if (!supabase || !fileUrl) return;
    try {
        if (!fileUrl.includes('supabase.co')) return;

        const filePath = extractStoragePath(fileUrl, bucket);
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
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.warn('No se pudo eliminar archivo de Supabase:', error.message);
        }
    } catch (err) {
        console.warn('No se pudo eliminar archivo antiguo:', err.message);
    }
}
