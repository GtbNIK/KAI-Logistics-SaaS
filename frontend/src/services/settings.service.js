import api from '../lib/api';

/**
 * Servicio para gestionar la configuración de la empresa
 */
const settingsService = {
    /**
     * Obtener configuración de la empresa
     */
    getSettings: async () => {
        const response = await api.get('/settings');
        return response.data;
    },

    /**
     * Actualizar configuración de la empresa
     * @param {Object} data - Campos de texto (companyName, colors, etc.)
     * @param {Object} files - Archivos opcionales { quoteBg: File, noticeBg: File }
     * @param {Object} removals - Flags de borrado { removeQuoteBg: bool, removeNoticeBg: bool }
     */
    updateSettings: async (data, files = {}, removals = {}) => {
        const formData = new FormData();

        // Campos de texto
        Object.entries(data).forEach(([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                !['logoUrl', 'quoteBgUrl', 'noticeBgUrl', 'deliveryNoteBgUrl', 'receiptBgUrl', 'rateBgUrl'].includes(key)
            ) {
                formData.append(key, value);
            }
        });

        // Archivos de imagen
        if (files.logo) formData.append('logo', files.logo);
        if (files.quoteBg) formData.append('quoteBg', files.quoteBg);
        if (files.noticeBg) formData.append('noticeBg', files.noticeBg);
        if (files.deliveryNoteBg) formData.append('deliveryNoteBg', files.deliveryNoteBg);
        if (files.receiptBg) formData.append('receiptBg', files.receiptBg);
        if (files.rateBg) formData.append('rateBg', files.rateBg);

        // Flags de eliminación
        if (removals.removeLogo) formData.append('removeLogo', 'true');
        if (removals.removeQuoteBg) formData.append('removeQuoteBg', 'true');
        if (removals.removeNoticeBg) formData.append('removeNoticeBg', 'true');
        if (removals.removeDeliveryNoteBg) formData.append('removeDeliveryNoteBg', 'true');
        if (removals.removeReceiptBg) formData.append('removeReceiptBg', 'true');
        if (removals.removeRateBg) formData.append('removeRateBg', 'true');

        const response = await api.put('/settings', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export default settingsService;
