import api from '../lib/api';

export const notificationService = {
    getUnread: async () => {
        const response = await api.get('/notifications/unread');
        return response.data;
    },
    markAsRead: async (id) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },
    markAllAsRead: async () => {
        const response = await api.put('/notifications/mark-all-read');
        return response.data;
    }
};
