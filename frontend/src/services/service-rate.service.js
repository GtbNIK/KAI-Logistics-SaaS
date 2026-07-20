import api from '../lib/api';

const rateService = {
    /**
     * Buscar tarifa específica para el cotizador
     * @param {Object} params - { serviceId, allyId, zoneId? }
     * @returns Objeto con { found: boolean, rate?: objeto tarifa }
     */
    findRate: async (params) => {
        const response = await api.get('/service-rates/find', { params });
        return response.data;
    },

    /**
     * Obtener lista de tarifas (para administración)
     */
    getRates: async (params) => {
        const response = await api.get('/service-rates', { params });
        return response.data;
    }
};

export default rateService;
