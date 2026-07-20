/**
 * Tenant Context - Almacena el tenantId del request actual.
 * Usa AsyncLocalStorage de Node.js para mantener el contexto sin pasarlo manualmente.
 *
 * Patron: cada request HTTP entra a un async context, los services/controllers
 * leen el tenantId sin necesidad de recibirlo como parametro.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const tenantStorage = new AsyncLocalStorage();

/**
 * Ejecuta una funcion dentro de un contexto de tenant.
 * Todos los calls async dentro de la funcion tendran acceso al tenantId via getCurrentTenantId().
 */
export const runWithTenant = (tenantId, fn) => {
    return tenantStorage.run({ tenantId }, fn);
};

/**
 * Ejecuta una funcion dentro de un contexto SIN tenant (ej: rutas publicas, admin, signup).
 * Sirve para limpiar el contexto y prevenir fugas.
 */
export const runWithoutTenant = (fn) => {
    return tenantStorage.run({ tenantId: null }, fn);
};

/**
 * Devuelve el tenantId del contexto actual, o null si no hay tenant activo.
 */
export const getCurrentTenantId = () => {
    const store = tenantStorage.getStore();
    return store?.tenantId || null;
};

/**
 * Indica si el contexto actual tiene un tenant activo.
 */
export const hasTenantContext = () => {
    return getCurrentTenantId() !== null;
};

/**
 * Devuelve el store completo (uso interno principalmente).
 */
export const getTenantStore = () => {
    return tenantStorage.getStore();
};
