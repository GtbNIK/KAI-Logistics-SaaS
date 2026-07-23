import api from '../lib/api';

const allyService = {
    getAllies: async (params = {}) => {
        const response = await api.get('/allies', { params });
        return response.data;
    },

    getAlly: async (id) => {
        const response = await api.get(`/allies/${id}`);
        return response.data;
    },

    createAlly: async (data) => {
        const response = await api.post('/allies', data);
        return response.data;
    },

    updateAlly: async (id, data) => {
        const response = await api.put(`/allies/${id}`, data);
        return response.data;
    },

    deleteAlly: async (id) => {
        const response = await api.delete(`/allies/${id}`);
        return response.data;
    },

    toggleAllyStatus: async (id) => {
        const response = await api.patch(`/allies/${id}/toggle-status`);
        return response.data;
    },

    // ============ TARIFAS ============
    
    getAllyRates: async (allyId) => {
        const response = await api.get(`/allies/${allyId}/rates`);
        return response.data;
    },

    upsertAllyRate: async (allyId, data) => {
        const response = await api.post(`/allies/${allyId}/rates`, data);
        return response.data;
    },

    deleteAllyRate: async (allyId, rateId) => {
        const response = await api.delete(`/allies/${allyId}/rates/${rateId}`);
        return response.data;
    },

    // ============ CATÁLOGOS ============
    
    getZones: async () => {
        const response = await api.get('/allies/catalogs/zones');
        return response.data;
    },

    getServices: async () => {
        const response = await api.get('/allies/catalogs/services');
        return response.data;
    }
};

export default allyService;
