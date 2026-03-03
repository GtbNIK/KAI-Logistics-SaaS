import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Servicio para gestionar la configuración de la empresa
 */
const settingsService = {
    /**
     * Obtener configuración de la empresa
     */
    getSettings: async () => {
        const response = await axios.get(`${API_URL}/settings`, { withCredentials: true });
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
            if (value !== undefined && value !== null && key !== 'quoteBgUrl' && key !== 'noticeBgUrl' && key !== 'deliveryNoteBgUrl') {
                formData.append(key, value);
            }
        });

        // Archivos de imagen
        if (files.quoteBg) formData.append('quoteBg', files.quoteBg);
        if (files.noticeBg) formData.append('noticeBg', files.noticeBg);
        if (files.deliveryNoteBg) formData.append('deliveryNoteBg', files.deliveryNoteBg);

        // Flags de eliminación
        if (removals.removeQuoteBg) formData.append('removeQuoteBg', 'true');
        if (removals.removeNoticeBg) formData.append('removeNoticeBg', 'true');
        if (removals.removeDeliveryNoteBg) formData.append('removeDeliveryNoteBg', 'true');

        const response = await axios.put(`${API_URL}/settings`, formData, {
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export default settingsService;
