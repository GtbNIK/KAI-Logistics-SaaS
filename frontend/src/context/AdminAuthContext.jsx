/**
 * AdminAuthContext - Auth separada para el panel admin (super-admin).
 *
 * Completamente independiente del AuthContext de tenants.
 * Usa cookies httpOnly 'admin_token' y endpoints /api/admin/*.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setAdminContext } from '../lib/api.js';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const ctx = useContext(AdminAuthContext);
    if (!ctx) throw new Error('useAdminAuth debe usarse dentro de AdminAuthProvider');
    return ctx;
};

export const AdminAuthProvider = ({ children }) => {
    const [superAdmin, setSuperAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setAdminContext(true);
        return () => setAdminContext(false);
    }, []);

    useEffect(() => {
        const handler = () => {
            setSuperAdmin(null);
            if (window.location.pathname.startsWith('/admin') &&
                !window.location.pathname.startsWith('/admin/login')) {
                window.location.href = '/admin/login';
            }
        };
        window.addEventListener('kai:admin-auth-expired', handler);
        return () => window.removeEventListener('kai:admin-auth-expired', handler);
    }, []);

    const checkSuperAdmin = useCallback(async () => {
        try {
            const res = await api.get('/admin/auth/me');
            setSuperAdmin(res.data.superAdmin);
        } catch (e) { void e; } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSuperAdmin();
    }, [checkSuperAdmin]);

    const login = useCallback(async (email, password, totpCode) => {
        const res = await api.post('/admin/auth/login', { email, password, totpCode });
        setSuperAdmin(res.data.superAdmin);
        return res.data;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/admin/auth/logout');
        } catch (e) { void e; }
        setSuperAdmin(null);
    }, []);

    return (
        <AdminAuthContext.Provider
            value={{
                superAdmin,
                loading,
                login,
                logout,
                checkSuperAdmin,
            }}
        >
            {!loading && children}
        </AdminAuthContext.Provider>
    );
};
