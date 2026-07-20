/**
 * Cliente axios centralizado para KAI Logistics SaaS.
 *
 * - Inyecta automaticamente el header `X-Tenant-Slug` desde el TenantContext
 *   en TODAS las requests a /api/* (excepto /api/auth/* y /api/admin/*).
 * - Envia cookies httpOnly (withCredentials) para que el backend use el JWT
 *   de sesion automaticamente.
 * - Maneja errores 401 y 403 redirigiendo al login o mostrando mensaje.
 */

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

            if (status === 401 && !window.location.pathname.startsWith('/login')) {
                // Sesion expirada o token invalido
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
