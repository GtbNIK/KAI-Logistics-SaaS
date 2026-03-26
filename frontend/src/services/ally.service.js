import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/allies`;

const allyService = {
    getAllies: async (params = {}) => {
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    getAlly: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    createAlly: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    updateAlly: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    deleteAlly: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },

    toggleAllyStatus: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/toggle-status`);
        return response.data;
    },

    // ============ TARIFAS ============
    
    getAllyRates: async (allyId) => {
        const response = await axios.get(`${API_URL}/${allyId}/rates`);
        return response.data;
    },

    upsertAllyRate: async (allyId, data) => {
        const response = await axios.post(`${API_URL}/${allyId}/rates`, data);
        return response.data;
    },

    deleteAllyRate: async (allyId, rateId) => {
        const response = await axios.delete(`${API_URL}/${allyId}/rates/${rateId}`);
        return response.data;
    },

    // ============ CATÁLOGOS ============
    
    getZones: async () => {
        const response = await axios.get(`${API_URL}/catalogs/zones`);
        return response.data;
    },

    getServices: async () => {
        const response = await axios.get(`${API_URL}/catalogs/services`);
        return response.data;
    }
};

export default allyService;
