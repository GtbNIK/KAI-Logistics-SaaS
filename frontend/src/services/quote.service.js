import api from '../lib/api';

const quoteService = {
    // Obtener todas las cotizaciones con filtros
    getQuotes: async (params) => {
        const response = await api.get('/quotes', { params });
        return response.data;
    },

    // Obtener una cotización por ID
    getQuote: async (id) => {
        const response = await api.get(`/quotes/${id}`);
        return response.data;
    },

    // Obtener el siguiente número de cotización
    getNextNumber: async () => {
        const response = await api.get('/quotes/next-number');
        return response.data;
    },

    // Crear nueva cotización
    createQuote: async (quoteData) => {
        const response = await api.post('/quotes', quoteData);
        return response.data;
    },

    // Actualizar cotización
    updateQuote: async (id, quoteData) => {
        const response = await api.put(`/quotes/${id}`, quoteData);
        return response.data;
    },

    // Cambiar estado
    updateQuoteStatus: async (id, status) => {
        const response = await api.patch(`/quotes/${id}/status`, { status });
        return response.data;
    },

    // Eliminar cotización
    deleteQuote: async (id) => {
        const response = await api.delete(`/quotes/${id}`);
        return response.data;
    },

    // Generar PDF (futuro)
    downloadPdf: async (id) => {
        const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
        return response.data;
    }
};

export default quoteService;
