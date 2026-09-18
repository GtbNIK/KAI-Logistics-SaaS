import api from '../lib/api';

const shipmentService = {
    getShipments: async (params = {}) => {
        const response = await api.get('/shipments', { params });
        return response.data;
    },

    getShipment: async (id) => {
        const response = await api.get(`/shipments/${id}`);
        return response.data;
    },

    createShipment: async (data) => {
        const response = await api.post('/shipments', data);
        return response.data;
    },

    updateShipment: async (id, data) => {
        const response = await api.put(`/shipments/${id}`, data);
        return response.data;
    },

    deleteShipment: async (id) => {
        const response = await api.delete(`/shipments/${id}`);
        return response.data;
    },

    // Obtener avisos de cobro sin tracking asignado (para el select)
    getAvailableNotices: async () => {
        const response = await api.get('/payment-notices', {
            params: { limit: 999 }
        });
        // La respuesta es paginada: { data: [...], meta: {...} }
        const notices = response.data?.data || response.data || [];
        return notices.filter(n => !n.tracking);
    },

    // Obtener usuarios vendedores/admins para el select
    getVendedores: async () => {
        const response = await api.get('/auth/users', {
            params: { limit: 999 }
        });
        const users = response.data?.users || [];
        // Solo ADMIN y SALES
        return users.filter(u => u.role === 'ADMIN' || u.role === 'SALES');
    },

    // Obtener clientes activos para el select
    getClients: async () => {
        const response = await api.get('/clients', {
            params: { all: 'true' }
        });
        return response.data?.data || [];
    },

    // ── Líneas Navieras ──────────────────────────────────────────
    getShippingLines: async () => {
        const response = await api.get('/shipping-lines', {
            params: { all: 'true' }
        });
        return response.data?.data || [];
    },

    createShippingLine: async (name, code) => {
        const response = await api.post('/shipping-lines', { name, code });
        return response.data;
    },
    // ── Puertos ──────────────────────────────────────────────────
    getPorts: async () => {
        const response = await api.get('/ports', {
            params: { all: 'true' }
        });
        return response.data?.data || response.data || [];
    },

    createPort: async (name) => {
        const response = await api.post('/ports', { name });
        return response.data;
    },

    // ── D2D Items ────────────────────────────────────────────────
    getD2DItems: async () => {
        const response = await api.get('/d2d-items', {
            params: { all: 'true' }
        });
        return response.data?.data || response.data || [];
    },

    // ── Aliados ──────────────────────────────────────────────────
    getAllies: async () => {
        const response = await api.get('/allies', {
            params: { all: 'true' }
        });
        return response.data?.data || response.data || [];
    },

    // ── Cierre Mensual ───────────────────────────────────────────
    getMonthlyClose: async (month) => {
        const response = await api.get('/shipments/monthly-close', {
            params: { month }
        });
        return response.data;
    },
};

export default shipmentService;
