/**
 * imageHelpers.js
 * Utilidades para manipular imágenes en el navegador.
 */

/**
 * Carga una imagen desde una URL/base64 y devuelve el elemento Image.
 */
export const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
        img.src = src;
    });
};

/**
 * Carga una imagen como Data URL base64 desde una URL.
 */
export const loadImageAsBase64 = async (url) => {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
};

/**
 * Redimensiona una imagen manteniendo la proporción.
 * @param {HTMLImageElement|ImageBitmap} img - Imagen cargada.
 * @param {Object} options - Opciones de redimensionado.
 * @param {number} options.maxWidth - Ancho máximo.
 * @param {number} options.maxHeight - Alto máximo.
 * @param {string} options.format - Formato de salida ('png' | 'jpeg').
 * @param {number} options.quality - Calidad JPEG (0-1).
 */
export const resizeImage = async (img, { maxWidth, maxHeight, format = 'png', quality = 0.8 } = {}) => {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const scaleW = maxWidth ? (maxWidth / srcW) : 1;
    const scaleH = maxHeight ? (maxHeight / srcH) : 1;
    const scale = Math.min(scaleW, scaleH, 1);
    const outW = Math.max(1, Math.floor(srcW * scale));
    const outH = Math.max(1, Math.floor(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
    } else {
        ctx.clearRect(0, 0, outW, outH);
    }

    ctx.drawImage(img, 0, 0, outW, outH);
    return canvas.toDataURL(`image/${format}`, quality);
};

/**
 * Comprime un archivo de imagen a base64 JPEG redimensionando a un tamaño máximo.
 * @param {File} file - Archivo de imagen original.
 * @param {number} maxWidth - Ancho máximo.
 * @param {number} maxHeight - Alto máximo.
 * @param {number} quality - Calidad JPEG (0-1).
 */
export const compressImageFile = (file, maxWidth = 800, maxHeight = 800, quality = 0.5) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const img = await loadImage(e.target.result);
                const base64 = await resizeImage(img, { maxWidth, maxHeight, format: 'jpeg', quality });
                resolve(base64);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Redimensiona una imagen PNG manteniendo proporción (compatibilidad con implementación anterior).
 * @param {HTMLImageElement} img
 * @param {Object} options
 */
export const resizePngDataUrl = async (img, { maxWidth, maxHeight } = {}) => {
    return resizeImage(img, { maxWidth, maxHeight, format: 'png', quality: 1 });
};
