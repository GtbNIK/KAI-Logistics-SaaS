import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 30000,
});

const TENANT_HEADER_NAME = 'X-Tenant-Slug';

let currentTenantSlug = null;
let isAdminContext = false;

export const setTenantHeader = (slug) => {
    currentTenantSlug = slug || null;
};

export const setAdminContext = (isAdmin) => {
    isAdminContext = !!isAdmin;
};

api.interceptors.request.use(
    (config) => {
        const url = config.url || '';
        const isAuthRoute = url.startsWith('/auth/');
        const isAdminRoute = url.startsWith('/admin/');

        if (!isAuthRoute && !isAdminRoute && currentTenantSlug) {
            config.headers = config.headers || {};
            config.headers[TENANT_HEADER_NAME] = currentTenantSlug;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;
            const code = error.response.data?.code;

            // 403 con codigo de tenant bloqueado/expirado → redirigir a /blocked
            // Si ya estamos en /blocked no redirigimos otra vez (evita loop infinito)
            if ((code === 'TENANT_EXPIRED' || code === 'TENANT_BLOCKED') &&
                window.location.pathname !== '/blocked') {
                try {
                    sessionStorage.setItem('kai:tenantBlockReason', code);
                    sessionStorage.setItem('kai:tenantBlockMessage', error.response.data?.message || '');
                } catch (e) { void e; }
                window.location.href = '/blocked';
                return Promise.reject(error);
            }

            // 401 sin ruta admin → sesion expirada
            if (status === 401 && !window.location.pathname.startsWith('/login')) {
                if (!isAdminContext) {
                    window.dispatchEvent(new CustomEvent('kai:auth-expired'));
                } else if (window.location.pathname.startsWith('/admin')) {
                    window.dispatchEvent(new CustomEvent('kai:admin-auth-expired'));
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;