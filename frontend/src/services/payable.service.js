import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const payableService = {
    getPayables: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page);
        if (params.limit) query.append('limit', params.limit);
        if (params.search) query.append('search', params.search);
        if (params.status) query.append('status', params.status);
        const response = await axios.get(`${API_URL}/payables?${query.toString()}`);
        return response.data;
    },

    getPayableById: async (id) => {
        const response = await axios.get(`${API_URL}/payables/${id}`);
        return response.data;
    },

    createPayable: async (data) => {
        const response = await axios.post(`${API_URL}/payables`, data);
        return response.data;
    },

    registerPayment: async (id, paymentData) => {
        const response = await axios.post(`${API_URL}/payables/${id}/payments`, paymentData);
        return response.data;
    },

    deletePayable: async (id) => {
        const response = await axios.delete(`${API_URL}/payables/${id}`);
        return response.data;
    },
};

export default payableService;
