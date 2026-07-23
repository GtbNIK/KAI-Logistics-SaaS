import api from '../lib/api';

const svcProviderService = {
    getSvcProviders: async () => {
        const response = await api.get('/svc-providers');
        return response.data?.data || response.data || [];
    },

    createSvcProvider: async (name) => {
        const response = await api.post('/svc-providers', { name });
        return response.data;
    },
};

export default svcProviderService;
