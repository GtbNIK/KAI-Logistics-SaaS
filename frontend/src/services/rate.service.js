import api from '../lib/api';

const rateService = {
    getRates: async (params = {}) => {
        const response = await api.get('/rates', { params });
        return response.data;
    },

    createRate: async (data) => {
        const response = await api.post('/rates', data);
        return response.data;
    },

    updateRate: async (id, data) => {
        const response = await api.put(`/rates/${id}`, data);
        return response.data;
    },

    deleteRate: async (id) => {
        const response = await api.delete(`/rates/${id}`);
        return response.data;
    },

    getExpiredRates: async () => {
        const response = await api.get('/rates/expired');
        return response.data;
    },

    // Buscar tarifa activa exacta (para cotizaciones)
    findRate: async (params) => {
        const response = await api.get('/rates/find', { params });
        return response.data;
    },

    // Activación masiva
    bulkActivate: async (allyId) => {
        const response = await api.patch('/rates/bulk-activate', { allyId });
        return response.data;
    },

    bulkDeactivate: async (allyId) => {
        const response = await api.patch('/rates/bulk-deactivate', { allyId });
        return response.data;
    },

    // Toggle individual
    toggleActive: async (id) => {
        const response = await api.patch(`/rates/${id}/toggle-active`);
        return response.data;
    },

    // Tarifas por entidad (para modales)
    getRatesByAlly: async (allyId) => {
        const response = await api.get(`/rates/by-ally/${allyId}`);
        return response.data;
    },

    getRatesByPort: async (portId) => {
        const response = await api.get(`/rates/by-port/${portId}`);
        return response.data;
    },

    getRatesByShippingLine: async (shippingLineId) => {
        const response = await api.get(`/rates/by-shipping-line/${shippingLineId}`);
        return response.data;
    }
};

export default rateService;
