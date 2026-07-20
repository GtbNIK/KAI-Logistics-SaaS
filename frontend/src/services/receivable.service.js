import api from '../lib/api';

const receivableService = {
    /**
     * Obtener lista de cuentas por cobrar (cartera de clientes)
     * @param {Object} filters - Ej: { status: 'PENDING' }
     */
    getReceivables: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        
        const response = await api.get(`/receivables?${params.toString()}`);
        return response.data;
    },

    /**
     * Obtener el detalle de una cuenta por cobrar (historial de pagos)
     */
    getReceivableById: async (id) => {
        const response = await api.get(`/receivables/${id}`);
        return response.data;
    },

    /**
     * Registrar un abono o pago a una cuenta por cobrar
     * @param {string} id - ID del Receivable
     * @param {Object} paymentData - { amount, method, reference, date }
     */
    registerPayment: async (id, paymentData) => {
        const response = await api.post(`/receivables/${id}/payments`, paymentData);
        return response.data;
    },

    /**
     * Actualizar una cuenta por cobrar
     * @param {string} id - ID del Receivable
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Respuesta del servidor con la cuenta actualizada
     */
    updateReceivable: async (id, data) => {
        const response = await api.put(`/receivables/${id}`, data);
        return response.data;
    },

    /**
     * Eliminar un abono o pago específico de una cuenta por cobrar
     * @param {string} id - ID del Receivable
     * @param {string} paymentId - ID del pago a eliminar
     * @returns {Promise<Object>} Respuesta del servidor con la cuenta actualizada
     */
    deletePayment: async (id, paymentId) => {
        const response = await api.delete(`/receivables/${id}/payments/${paymentId}`);
        return response.data;
    },

    /**
     * Eliminar una cuenta por cobrar junto con todos sus pagos asociados
     * @param {string} id - ID del Receivable a eliminar
     * @returns {Promise<Object>} Respuesta del servidor confirmando la eliminación
     */
    deleteReceivable: async (id) => {
        const response = await api.delete(`/receivables/${id}`);
        return response.data;
    }
};

export default receivableService;
