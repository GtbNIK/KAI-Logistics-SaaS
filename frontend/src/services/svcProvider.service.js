import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const svcProviderService = {
    getSvcProviders: async () => {
        const response = await axios.get(`${API_URL}/svc-providers`, { withCredentials: true });
        return response.data?.data || response.data || [];
    },

    createSvcProvider: async (name) => {
        const response = await axios.post(`${API_URL}/svc-providers`, { name }, { withCredentials: true });
        return response.data;
    },
};

export default svcProviderService;
