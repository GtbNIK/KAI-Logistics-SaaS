import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/rates`;

const rateService = {
    getRates: async (params = {}) => {
        const response = await axios.get(API_URL, { params, withCredentials: true });
        return response.data;
    },

    createRate: async (data) => {
        const response = await axios.post(API_URL, data, { withCredentials: true });
        return response.data;
    },

    updateRate: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data, { withCredentials: true });
        return response.data;
    },

    deleteRate: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    },

    getExpiredRates: async () => {
        const response = await axios.get(`${API_URL}/expired`, { withCredentials: true });
        return response.data;
    }
};

export default rateService;
