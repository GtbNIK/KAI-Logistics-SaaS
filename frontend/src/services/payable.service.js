import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const payableService = {
    /**
     * Obtiene la lista de cuentas por pagar con filtros y paginación
     * @param {Object} params - Parámetros de consulta
     * @param {number} params.page - Número de página
     * @param {number} params.limit - Límite de resultados por página
     * @param {string} params.search - Término de búsqueda
     * @param {string} params.status - Filtro por estado
     * @returns {Promise<Object>} Lista de cuentas por pagar paginadas
     */
    getPayables: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page);
        if (params.limit) query.append('limit', params.limit);
        if (params.search) query.append('search', params.search);
        if (params.status) query.append('status', params.status);
        const response = await axios.get(`${API_URL}/payables?${query.toString()}`);
        return response.data;
    },

    /**
     * Obtiene el detalle de una cuenta por pagar específica
     * @param {string} id - ID de la cuenta por pagar
     * @returns {Promise<Object>} Detalle de la cuenta por pagar
     */
    getPayableById: async (id) => {
        const response = await axios.get(`${API_URL}/payables/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva cuenta por pagar
     * @param {Object} data - Datos de la cuenta por pagar
     * @returns {Promise<Object>} Cuenta por pagar creada
     */
    createPayable: async (data) => {
        const response = await axios.post(`${API_URL}/payables`, data);
        return response.data;
    },

    /**
     * Actualiza una cuenta por pagar existente
     * @param {string} id - ID de la cuenta por pagar
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Cuenta por pagar actualizada
     */
    updatePayable: async (id, data) => {
        const response = await axios.put(`${API_URL}/payables/${id}`, data);
        return response.data;
    },

    /**
     * Registra un pago/abono a una cuenta por pagar
     * @param {string} id - ID de la cuenta por pagar
     * @param {Object} paymentData - Datos del pago
     * @returns {Promise<Object>} Pago registrado
     */
    registerPayment: async (id, paymentData) => {
        const response = await axios.post(`${API_URL}/payables/${id}/payments`, paymentData);
        return response.data;
    },

    /**
     * Elimina un pago específico de una cuenta por pagar
     * @param {string} id - ID de la cuenta por pagar
     * @param {string} paymentId - ID del pago a eliminar
     * @returns {Promise<Object>} Respuesta del servidor
     */
    deletePayment: async (id, paymentId) => {
        const response = await axios.delete(`${API_URL}/payables/${id}/payments/${paymentId}`);
        return response.data;
    },

    /**
     * Elimina una cuenta por pagar y todos sus pagos asociados
     * @param {string} id - ID de la cuenta por pagar a eliminar
     * @returns {Promise<Object>} Respuesta del servidor confirmando la eliminación
     */
    deletePayable: async (id) => {
        const response = await axios.delete(`${API_URL}/payables/${id}`);
        return response.data;
    },
};

export default payableService;
