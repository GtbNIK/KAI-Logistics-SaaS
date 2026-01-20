import axios from 'axios';

const API_URL = '/api/services';

const serviceService = {
    getServices: async (params = {}) => {
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    getService: async (id) => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    createService: async (data) => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    updateService: async (id, data) => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    deleteService: async (id) => {
        const response = await axios.delete(`${API_URL}/${id}`);
        return response.data;
    },

    getServiceTypes: async () => {
        const response = await axios.get(`${API_URL}/types`);
        return response.data;
    }
};

export default serviceService;
