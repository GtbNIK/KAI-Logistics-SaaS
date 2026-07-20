/**
 * AuthContext multi-tenant.
 *
 * Maneja:
 * - User actual
 * - Login / Signup / Logout
 * - Switch tenant
 * - Estado de carga
 *
 * El tenant activo lo maneja TenantContext, pero AuthContext lo sincroniza
 * automaticamente al loguear (toma el currentTenant del response del login).
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api.js';
import { useTenant } from './TenantContext.jsx';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpiresAt, setSessionExpiresAt] = useState(null);

    const { setTenantsList, setCurrentTenantSlug } = useTenant();

    useEffect(() => {
        const handler = () => {
            setUser(null);
            setSessionExpiresAt(null);
            setTenantsList([]);
            try {
                localStorage.removeItem('sessionExpiresAt');
                localStorage.removeItem('kai:currentTenantSlug');
            } catch (e) { void e; }
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        };
        window.addEventListener('kai:auth-expired', handler);
        return () => window.removeEventListener('kai:auth-expired', handler);
    }, [setTenantsList]);

    const applySession = useCallback(
        (data) => {
            if (data.user) setUser(data.user);
            if (data.expiresAt) {
                setSessionExpiresAt(new Date(data.expiresAt));
        try {
            localStorage.setItem('sessionExpiresAt', data.expiresAt);
        } catch (e) { void e; }
            }
            if (data.tenants) setTenantsList(data.tenants);
            if (data.currentTenant) setCurrentTenantSlug(data.currentTenant.slug);
        },
        [setTenantsList, setCurrentTenantSlug]
    );

    const checkUser = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            applySession(res.data);
        } catch {
            setUser(null);
            setSessionExpiresAt(null);
        } finally {
            setLoading(false);
        }
    }, [applySession]);

    useEffect(() => {
        checkUser();
    }, [checkUser]);

    const login = useCallback(
        async (email, password) => {
            const res = await api.post('/auth/login', { email, password });
            applySession(res.data);
            return res.data;
        },
        [applySession]
    );

    const signup = useCallback(
        async (payload) => {
            const res = await api.post('/auth/signup', payload);
            applySession(res.data);
            return res.data;
        },
        [applySession]
    );

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) { void e; }
        setUser(null);
        setSessionExpiresAt(null);
        setTenantsList([]);
        setCurrentTenantSlug(null);
        try {
            localStorage.removeItem('sessionExpiresAt');
            localStorage.removeItem('kai:currentTenantSlug');
        } catch (e) { void e; }
    }, [setTenantsList, setCurrentTenantSlug]);

    const switchTenant = useCallback(
        async (tenantId) => {
            const res = await api.post('/auth/switch-tenant', { tenantId });
            if (res.data.tenant) {
                setCurrentTenantSlug(res.data.tenant.slug);
                // Refrescar /auth/me para sincronizar listas
                await checkUser();
            }
            return res.data;
        },
        [setCurrentTenantSlug, checkUser]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                sessionExpiresAt,
                login,
                signup,
                logout,
                switchTenant,
                checkUser,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};
