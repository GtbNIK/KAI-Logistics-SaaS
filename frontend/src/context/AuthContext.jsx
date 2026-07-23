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

    const applySession = useCallback((data) => {
        if (data.user) setUser(data.user);
        if (data.expiresAt) {
            setSessionExpiresAt(new Date(data.expiresAt));
            try { localStorage.setItem('sessionExpiresAt', data.expiresAt); } catch (e) { void e; }
        }
        if (data.tenants) {
            const safeTenants = data.tenants.map((t) => ({
                ...t,
                role: t.role ?? 'GUEST',
                isReadOnly: t.isReadOnly ?? (t.status === 'TRIAL'),
            }));
            setTenantsList(safeTenants);
        }
        if (data.currentTenant && data.currentTenant.slug) {
            setCurrentTenantSlug(data.currentTenant.slug);
        }

        if (data.tenant && data.tenant.slug) {
            setCurrentTenantSlug(data.tenant.slug);
        }
    }, [setTenantsList, setCurrentTenantSlug]);

    const checkUser = useCallback(async () => {
        // Si no hay sessionExpiresAt guardado, no hay sesion activa — evitar 401 innecesario
        const hasStoredSession = (() => {
            try { return !!localStorage.getItem('sessionExpiresAt'); } catch { return false; }
        })();
        if (!hasStoredSession) {
            setUser(null);
            setSessionExpiresAt(null);
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/auth/me');
            applySession(res.data);
            // Si /auth/me no devuelve expiresAt, restaurarlo desde localStorage
            // para que el reloj de sesión funcione al recargar la página
            if (!res.data.expiresAt) {
                const stored = (() => { try { return localStorage.getItem('sessionExpiresAt'); } catch { return null; } })();
                if (stored) setSessionExpiresAt(new Date(stored));
            }
        } catch (e) { void e; setUser(null); setSessionExpiresAt(null); }
        finally { setLoading(false); }
    }, [applySession]);

    useEffect(() => { checkUser(); }, [checkUser]);

    const login = useCallback(async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        applySession(res.data);
        window.dispatchEvent(new CustomEvent('kai:tenant-changed'));
        return res.data;
    }, [applySession]);

    const signup = useCallback(async (payload) => {
        const res = await api.post('/auth/signup', payload);
        applySession(res.data);
        window.dispatchEvent(new CustomEvent('kai:tenant-changed'));
        return res.data;
    }, [applySession]);

    const logout = useCallback(async () => {
        try { await api.post('/auth/logout'); } catch (e) { void e; }
        setUser(null);
        setSessionExpiresAt(null);
        setTenantsList([]);
        setCurrentTenantSlug(null);
        try { localStorage.removeItem('sessionExpiresAt'); localStorage.removeItem('kai:currentTenantSlug'); } catch (e) { void e; }
        window.dispatchEvent(new CustomEvent('kai:tenant-changed'));
    }, [setTenantsList, setCurrentTenantSlug]);

    const forceLogout = useCallback(() => {
        setUser(null);
        setSessionExpiresAt(null);
        setTenantsList([]);
        setCurrentTenantSlug(null);
        try { localStorage.removeItem('sessionExpiresAt'); localStorage.removeItem('kai:currentTenantSlug'); } catch (e) { void e; }
        window.dispatchEvent(new CustomEvent('kai:tenant-changed'));
    }, [setTenantsList, setCurrentTenantSlug]);

    const refreshSession = useCallback(async () => {
        const res = await api.post('/auth/refresh');
        if (res.data.expiresAt) {
            setSessionExpiresAt(new Date(res.data.expiresAt));
            try { localStorage.setItem('sessionExpiresAt', res.data.expiresAt); } catch (e) { void e; }
        }
        // Refrescar datos completos del usuario/tenant para mantener sincronía
        await checkUser();
        return res.data;
    }, [checkUser]);

    const switchTenant = useCallback(async (tenantId) => {
        const res = await api.post('/auth/switch-tenant', { tenantId });
        if (res.data.tenant) setCurrentTenantSlug(res.data.tenant.slug);
        await checkUser();
        window.dispatchEvent(new CustomEvent('kai:tenant-changed'));
        return res.data;
    }, [setCurrentTenantSlug, checkUser]);

    return (
        <AuthContext.Provider value={{ user, loading, sessionExpiresAt, login, signup, logout, forceLogout, refreshSession, switchTenant, checkUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
