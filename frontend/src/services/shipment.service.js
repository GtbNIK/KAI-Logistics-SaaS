import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const shipmentService = {
    getShipments: async (params = {}) => {
        const response = await axios.get(`${API_URL}/shipments`, {
            params,
            withCredentials: true
        });
        return response.data;
    },

    getShipment: async (id) => {
        const response = await axios.get(`${API_URL}/shipments/${id}`, {
            withCredentials: true
        });
        return response.data;
    },

    createShipment: async (data) => {
        const response = await axios.post(`${API_URL}/shipments`, data, {
            withCredentials: true
        });
        return response.data;
    },

    updateShipment: async (id, data) => {
        const response = await axios.put(`${API_URL}/shipments/${id}`, data, {
            withCredentials: true
        });
        return response.data;
    },

    deleteShipment: async (id) => {
        const response = await axios.delete(`${API_URL}/shipments/${id}`, {
            withCredentials: true
        });
        return response.data;
    },

    // Obtener avisos de cobro sin tracking asignado (para el select)
    getAvailableNotices: async () => {
        const response = await axios.get(`${API_URL}/payment-notices`, {
            params: { limit: 999 },
            withCredentials: true
        });
        // La respuesta es paginada: { data: [...], meta: {...} }
        const notices = response.data?.data || response.data || [];
        return notices.filter(n => !n.tracking);
    },

    // Obtener usuarios vendedores/admins para el select
    getVendedores: async () => {
        const response = await axios.get(`${API_URL}/auth/users`, {
            params: { limit: 999 },
            withCredentials: true
        });
        const users = response.data?.users || [];
        // Solo ADMIN y SALES
        return users.filter(u => u.role === 'ADMIN' || u.role === 'SALES');
    },

    // Obtener clientes activos para el select
    getClients: async () => {
        const response = await axios.get(`${API_URL}/clients`, {
            params: { all: 'true' },
            withCredentials: true
        });
        return response.data?.data || [];
    },

    // ── Líneas Navieras ──────────────────────────────────────────
    getShippingLines: async () => {
        const response = await axios.get(`${API_URL}/shipping-lines`, {
            params: { all: 'true' },
            withCredentials: true
        });
        return response.data?.data || [];
    },

    createShippingLine: async (name, code) => {
        const response = await axios.post(`${API_URL}/shipping-lines`, { name, code }, {
            withCredentials: true
        });
        return response.data;
    },
    // ── Puertos ──────────────────────────────────────────────────
    getPorts: async () => {
        const response = await axios.get(`${API_URL}/ports`, {
            params: { all: 'true' },
            withCredentials: true
        });
        return response.data?.data || response.data || [];
    },

    createPort: async (name) => {
        const response = await axios.post(`${API_URL}/ports`, { name }, {
            withCredentials: true
        });
        return response.data;
    },

    // ── D2D Items ────────────────────────────────────────────────
    getD2DItems: async () => {
        const response = await axios.get(`${API_URL}/d2d-items`, {
            params: { all: 'true' },
            withCredentials: true
        });
        return response.data?.data || response.data || [];
    },

    // ── Aliados ──────────────────────────────────────────────────
    getAllies: async () => {
        const response = await axios.get(`${API_URL}/allies`, {
            params: { all: 'true' },
            withCredentials: true
        });
        return response.data?.data || response.data || [];
    },
};

export default shipmentService;
