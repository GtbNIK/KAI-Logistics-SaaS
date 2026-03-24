import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const authService = {
    login: async (email, password) => {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        return response.data;
    },

    logout: async () => {
        const response = await axios.post(`${API_URL}/auth/logout`);
        return response.data;
    },

    getMe: async () => {
        const response = await axios.get(`${API_URL}/auth/me`);
        return response.data;
    },

    getUsers: async () => {
        const response = await axios.get(`${API_URL}/auth/users`);
        return response.data;
    },

    register: async (userData) => {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await axios.put(`${API_URL}/auth/users/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await axios.delete(`${API_URL}/auth/users/${id}`);
        return response.data;
    },

    resetPassword: async (id, password) => {
        const response = await axios.post(`${API_URL}/auth/users/${id}/reset-password`, { password });
        return response.data;
    }
};

export default authService;
