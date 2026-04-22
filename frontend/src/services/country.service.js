import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const countryService = {
    getCountries: async () => {
        const response = await axios.get(`${API_URL}/countries`, { withCredentials: true });
        return response.data;
    },

    createCountry: async (data) => {
        const response = await axios.post(`${API_URL}/countries`, data, { withCredentials: true });
        return response.data;
    }
};

export default countryService;
