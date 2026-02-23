import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const paymentNoticeService = {
    /**
     * Convertir una cotización aprobada en un aviso de cobro
     */
    convertFromQuote: async (quoteId) => {
        const response = await axios.post(`${API_URL}/payment-notices/from-quote/${quoteId}`);
        return response.data;
    },

    /**
     * Obtener listado de avisos de cobro
     */
    getNotices: async () => {
        const response = await axios.get(`${API_URL}/payment-notices`);
        return response.data;
    },

    /**
     * Obtener detalle de aviso de cobro
     */
    getNoticeById: async (id) => {
        const response = await axios.get(`${API_URL}/payment-notices/${id}`);
        return response.data;
    }
};

export default paymentNoticeService;
