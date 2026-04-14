import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/shipping-lines`;

const shippingLineService = {
    getShippingLines: async (params = {}) => {
        const response = await axios.get(API_URL, { params, withCredentials: true });
        return response.data;
    },

    createShippingLine: async (data) => {
        const response = await axios.post(API_URL, data, { withCredentials: true });
        return response.data;
    },

    updateShippingLine: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data, { withCredentials: true });
        return response.data;
    },

    deleteShippingLine: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
        return response.data;
    },

    toggleStatus: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/toggle-status`, {}, { withCredentials: true });
        return response.data;
    }
};

export default shippingLineService;
