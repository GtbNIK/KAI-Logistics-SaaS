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
    },

    // Buscar tarifa activa exacta (para cotizaciones)
    findRate: async (params) => {
        const response = await axios.get(`${API_URL}/find`, { params, withCredentials: true });
        return response.data;
    },

    // Activación masiva
    bulkActivate: async (allyId) => {
        const response = await axios.patch(`${API_URL}/bulk-activate`, { allyId }, { withCredentials: true });
        return response.data;
    },

    bulkDeactivate: async (allyId) => {
        const response = await axios.patch(`${API_URL}/bulk-deactivate`, { allyId }, { withCredentials: true });
        return response.data;
    },

    // Toggle individual
    toggleActive: async (id) => {
        const response = await axios.patch(`${API_URL}/${id}/toggle-active`, {}, { withCredentials: true });
        return response.data;
    },

    // Tarifas por entidad (para modales)
    getRatesByAlly: async (allyId) => {
        const response = await axios.get(`${API_URL}/by-ally/${allyId}`, { withCredentials: true });
        return response.data;
    },

    getRatesByPort: async (portId) => {
        const response = await axios.get(`${API_URL}/by-port/${portId}`, { withCredentials: true });
        return response.data;
    },

    getRatesByShippingLine: async (shippingLineId) => {
        const response = await axios.get(`${API_URL}/by-shipping-line/${shippingLineId}`, { withCredentials: true });
        return response.data;
    }
};

export default rateService;
