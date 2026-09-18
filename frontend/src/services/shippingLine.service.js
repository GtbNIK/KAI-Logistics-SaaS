import api from '../lib/api';

const shippingLineService = {
    getShippingLines: async (params = {}) => {
        const response = await api.get('/shipping-lines', { params });
        return response.data;
    },

    createShippingLine: async (data) => {
        const response = await api.post('/shipping-lines', data);
        return response.data;
    },

    updateShippingLine: async (id, data) => {
        const response = await api.put(`/shipping-lines/${id}`, data);
        return response.data;
    },

    deleteShippingLine: async (id) => {
        const response = await api.delete(`/shipping-lines/${id}`);
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await api.patch(`/shipping-lines/${id}/toggle-status`);
        return response.data;
    }
};

export default shippingLineService;
