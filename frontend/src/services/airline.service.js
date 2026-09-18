import api from '../lib/api';

const airlineService = {
    getAirLines: async (params = {}) => {
        const response = await api.get('/airlines', { params });
        return response.data;
    },

    createAirLine: async (data) => {
        const response = await api.post('/airlines', data);
        return response.data;
    },

    updateAirLine: async (id, data) => {
        const response = await api.put(`/airlines/${id}`, data);
        return response.data;
    },

    deleteAirLine: async (id) => {
        const response = await api.delete(`/airlines/${id}`);
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await api.patch(`/airlines/${id}/toggle-status`);
        return response.data;
    }
};

export default airlineService;
