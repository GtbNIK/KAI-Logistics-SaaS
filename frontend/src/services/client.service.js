import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getClients = async (params) => {
    const response = await axios.get(`${API_URL}/clients`, { params });
    return response.data;
};

const getClient = async (id) => {
    const response = await axios.get(`${API_URL}/clients/${id}`);
    return response.data;
};

const createClient = async (data) => {
    const response = await axios.post(`${API_URL}/clients`, data);
    return response.data;
};

const updateClient = async (id, data) => {
    const response = await axios.put(`${API_URL}/clients/${id}`, data);
    return response.data;
};

const deleteClient = async (id) => {
    const response = await axios.delete(`${API_URL}/clients/${id}`);
    return response.data;
};

export default {
    getClients,
    getClient,
    createClient,
    updateClient,
    deleteClient
};
