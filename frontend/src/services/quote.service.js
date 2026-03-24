import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const quoteService = {
    // Obtener todas las cotizaciones con filtros
    getQuotes: async (params) => {
        const response = await axios.get(`${API_URL}/quotes`, { params });
        return response.data;
    },

    // Obtener una cotización por ID
    getQuote: async (id) => {
        const response = await axios.get(`${API_URL}/quotes/${id}`);
        return response.data;
    },

    // Obtener el siguiente número de cotización
    getNextNumber: async () => {
        const response = await axios.get(`${API_URL}/quotes/next-number`);
        return response.data;
    },

    // Crear nueva cotización
    createQuote: async (quoteData) => {
        const response = await axios.post(`${API_URL}/quotes`, quoteData);
        return response.data;
    },

    // Actualizar cotización
    updateQuote: async (id, quoteData) => {
        const response = await axios.put(`${API_URL}/quotes/${id}`, quoteData);
        return response.data;
    },

    // Cambiar estado
    updateQuoteStatus: async (id, status) => {
        const response = await axios.patch(`${API_URL}/quotes/${id}/status`, { status });
        return response.data;
    },

    // Eliminar cotización
    deleteQuote: async (id) => {
        const response = await axios.delete(`${API_URL}/quotes/${id}`);
        return response.data;
    },

    // Generar PDF (futuro)
    downloadPdf: async (id) => {
        const response = await axios.get(`${API_URL}/quotes/${id}/pdf`, { responseType: 'blob' });
        return response.data;
    }
};

export default quoteService;
