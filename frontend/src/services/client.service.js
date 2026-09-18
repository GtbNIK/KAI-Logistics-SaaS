import api from '../lib/api';

const getClients = async (params) => {
    const response = await api.get('/clients', { params });
    return response.data;
};

const getClient = async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
};

const createClient = async (data) => {
    const response = await api.post('/clients', data);
    return response.data;
};

const updateClient = async (id, data) => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
};

const deleteClient = async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
};

const toggleClientStatus = async (id, deactivationNote = null) => {
    const response = await api.patch(`/clients/${id}/toggle-status`, { deactivationNote });
    return response.data;
};

export default {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    toggleClientStatus
};
