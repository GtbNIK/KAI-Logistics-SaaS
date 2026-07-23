import api from '../lib/api';

const paymentNoticeService = {
    /**
     * Convertir una cotización aprobada en un aviso de cobro
     */
    convertFromQuote: async (quoteId) => {
        const response = await api.post(`/payment-notices/from-quote/${quoteId}`);
        return response.data;
    },

    /**
     * Obtener listado de avisos de cobro
     */
    getNotices: async () => {
        const response = await api.get('/payment-notices');
        return response.data;
    },

    /**
     * Obtener detalle de aviso de cobro
     */
    getNoticeById: async (id) => {
        const response = await api.get(`/payment-notices/${id}`);
        return response.data;
    }
};

export default paymentNoticeService;
