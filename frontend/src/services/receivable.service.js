import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const receivableService = {
    /**
     * Obtener lista de cuentas por cobrar (cartera de clientes)
     * @param {Object} filters - Ej: { status: 'PENDING' }
     */
    getReceivables: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        
        const response = await axios.get(`${API_URL}/receivables?${params.toString()}`);
        return response.data;
    },

    /**
     * Obtener el detalle de una cuenta por cobrar (historial de pagos)
     */
    getReceivableById: async (id) => {
        const response = await axios.get(`${API_URL}/receivables/${id}`);
        return response.data;
    },

    /**
     * Registrar un abono o pago a una cuenta por cobrar
     * @param {string} id - ID del Receivable
     * @param {Object} paymentData - { amount, method, reference, date }
     */
    registerPayment: async (id, paymentData) => {
        const response = await axios.post(`${API_URL}/receivables/${id}/payments`, paymentData);
        return response.data;
    },

            /**
     * Eliminar un abono o pago específico de una cuenta por cobrar
     * @param {string} id - ID del Receivable
     * @param {string} paymentId - ID del pago a eliminar
     * @returns {Promise<Object>} Respuesta del servidor con la cuenta actualizada
     */
    deletePayment: async (id, paymentId) => {
        const response = await axios.delete(`${API_URL}/receivables/${id}/payments/${paymentId}`);
        return response.data;
    },

    /**
     * Eliminar una cuenta por cobrar junto con todos sus pagos asociados
     * @param {string} id - ID del Receivable a eliminar
     * @returns {Promise<Object>} Respuesta del servidor confirmando la eliminación
     */
    deleteReceivable: async (id) => {
        const response = await axios.delete(`${API_URL}/receivables/${id}`);
        return response.data;
    }
};

export default receivableService;
