import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const notificationService = {
    getUnread: async () => {
        const response = await axios.get(`${API_URL}/notifications/unread`, { withCredentials: true });
        return response.data;
    },
    markAsRead: async (id) => {
        const response = await axios.put(`${API_URL}/notifications/${id}/read`, {}, { withCredentials: true });
        return response.data;
    },
    markAllAsRead: async () => {
        const response = await axios.put(`${API_URL}/notifications/mark-all-read`, {}, { withCredentials: true });
        return response.data;
    }
};
