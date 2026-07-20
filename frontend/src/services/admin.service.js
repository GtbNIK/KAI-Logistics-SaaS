/**
 * admin.service.js - Cliente para todos los endpoints /api/admin/*.
 */

import api from '../lib/api.js';

const adminService = {
    // Auth
    login: (email, password, totpCode) =>
        api.post('/admin/auth/login', { email, password, totpCode }).then((r) => r.data),
    logout: () => api.post('/admin/auth/logout').then((r) => r.data),
    me: () => api.get('/admin/auth/me').then((r) => r.data),

    // Tenants
    listTenants: (params = {}) =>
        api.get('/admin/tenants', { params }).then((r) => r.data),
    getTenant: (id) => api.get(`/admin/tenants/${id}`).then((r) => r.data),
    activateTenant: (id) => api.post(`/admin/tenants/${id}/activate`).then((r) => r.data),
    suspendTenant: (id, reason) => api.post(`/admin/tenants/${id}/suspend`, { reason }).then((r) => r.data),
    unsuspendTenant: (id) => api.post(`/admin/tenants/${id}/unsuspend`).then((r) => r.data),
    extendTrial: (id, days) => api.post(`/admin/tenants/${id}/extend-trial`, { days }).then((r) => r.data),

    // Payments
    registerPayment: (data) => api.post('/admin/payments', data).then((r) => r.data),
    listPayments: (params = {}) => api.get('/admin/payments', { params }).then((r) => r.data),

    // Metrics
    getMetrics: () => api.get('/admin/metrics').then((r) => r.data),

    // Workers
    runWorker: (jobName) => api.post('/admin/workers/run', { jobName }).then((r) => r.data),
    getWorkersStatus: () => api.get('/admin/workers/status').then((r) => r.data),
};

export default adminService;
