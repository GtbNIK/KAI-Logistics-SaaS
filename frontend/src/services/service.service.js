import api from '../lib/api';

const serviceService = {
    getAll: async (params = {}) => {
        const response = await api.get('/services', { params });
        return response.data;
    },

    getServices: async (params = {}) => {
        const response = await api.get('/services', { params });
        return response.data;
    },

    getService: async (id) => {
        const response = await api.get(`/services/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/services', data);
        return response.data;
    },

    createService: async (data) => {
        const response = await api.post('/services', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/services/${id}`, data);
        return response.data;
    },

    updateService: async (id, data) => {
        const response = await api.put(`/services/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/services/${id}`);
        return response.data;
    },

    deleteService: async (id) => {
        const response = await api.delete(`/services/${id}`);
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await api.patch(`/services/${id}/toggle`);
        return response.data;
    },

    getServiceTypes: async () => {
        const response = await api.get('/services/types');
        return response.data;
    }
};

export default serviceService;
