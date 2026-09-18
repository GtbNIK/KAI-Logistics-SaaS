import api from '../lib/api';

const countryService = {
    getCountries: async () => {
        const response = await api.get('/countries');
        return response.data;
    },

    createCountry: async (data) => {
        const response = await api.post('/countries', data);
        return response.data;
    }
};

export default countryService;
