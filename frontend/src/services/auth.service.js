import api from '../lib/api';

const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    getUsers: async () => {
        const response = await api.get('/auth/users');
        return response.data;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await api.put(`/auth/users/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await api.delete(`/auth/users/${id}`);
        return response.data;
    },

    resetPassword: async (id, password) => {
        const response = await api.post(`/auth/users/${id}/reset-password`, { password });
        return response.data;
    }
};

export default authService;
