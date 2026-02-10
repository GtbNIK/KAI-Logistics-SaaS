import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const rateService = {
    /**
     * Buscar tarifa específica para el cotizador
     * @param {Object} params - { serviceId, allyId, zoneId? }
     * @returns Objeto con { found: boolean, rate?: objeto tarifa }
     */
    findRate: async (params) => {
        const response = await axios.get(`${API_URL}/rates/find`, { 
            params,
            withCredentials: true 
        });
        return response.data;
    },

    /**
     * Obtener lista de tarifas (para administración)
     */
    getRates: async (params) => {
        const response = await axios.get(`${API_URL}/rates`, { 
            params,
            withCredentials: true 
        });
        return response.data;
    }
};

export default rateService;
