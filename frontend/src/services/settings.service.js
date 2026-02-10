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
     */
    updateSettings: async (data) => {
        const response = await axios.put(`${API_URL}/settings`, data, { withCredentials: true });
        return response.data;
    }
};

export default settingsService;
