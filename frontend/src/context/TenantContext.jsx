/**
 * TenantContext - Mantiene el tenant activo y la lista de tenants del usuario.
 * La actualizacion via applySession desde AuthContext setea tenants y slug.
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { setTenantHeader } from '../lib/api.js';

const TenantContext = createContext(null);
const STORAGE_KEY = 'kai:currentTenantSlug';

export const useTenant = () => {
    const ctx = useContext(TenantContext);
    if (!ctx) throw new Error('useTenant debe usarse dentro de TenantProvider');
    return ctx;
};

export const TenantProvider = ({ children }) => {
    const [tenants, setTenants] = useState([]);
    const [currentTenantSlug, setCurrentTenantSlugState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        setTenantHeader(currentTenantSlug);
    }, [currentTenantSlug]);

    const setCurrentTenantSlug = useCallback((slug) => {
        // Sincronizar el header SIEMPRE en el mismo tick del cambio, para que
        // ninguna peticion en vuelo salga con el slug del tenant anterior
        setTenantHeader(slug);
        setCurrentTenantSlugState(slug);
        try {
            if (slug) {
                localStorage.setItem(STORAGE_KEY, slug);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // Ignorar errores de localStorage
        }
    }, []);

    const setTenantsList = useCallback((list) => {
        setTenants(list || []);
    }, []);

    const currentTenant = useMemo(
        () => tenants.find((t) => t.slug === currentTenantSlug) || null,
        [tenants, currentTenantSlug]
    );

    const value = useMemo(
        () => ({
            tenants,
            currentTenant,
            currentTenantSlug,
            setCurrentTenantSlug,
            setTenantsList,
        }),
        [tenants, currentTenant, currentTenantSlug, setCurrentTenantSlug, setTenantsList]
    );

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
