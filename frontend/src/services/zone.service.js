import api from '../lib/api';

const zoneService = {
    getAll: async (params = {}) => {
        const response = await api.get('/zones', { params });
        return response.data;
    },

    getZones: async (params = {}) => {
        const response = await api.get('/zones', { params });
        return response.data;
    },

    getZone: async (id) => {
        const response = await api.get(`/zones/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/zones', data);
        return response.data;
    },

    createZone: async (data) => {
        const response = await api.post('/zones', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/zones/${id}`, data);
        return response.data;
    },

    updateZone: async (id, data) => {
        const response = await api.put(`/zones/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/zones/${id}`);
        return response.data;
    },

    deleteZone: async (id) => {
        const response = await api.delete(`/zones/${id}`);
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await api.patch(`/zones/${id}/toggle`);
        return response.data;
    }
};

export default zoneService;
