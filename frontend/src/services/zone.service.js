import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/zones`;

const zoneService = {
    getAll: async (params = {}) => {
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    getZones: async (params = {}) => {
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    getZone: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    createZone: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    updateZone: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },

    deleteZone: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/toggle`);
        return response.data;
    }
};

export default zoneService;
