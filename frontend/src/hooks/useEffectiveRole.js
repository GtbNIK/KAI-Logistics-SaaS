/**
 * useEffectiveRole - Hook que devuelve el rol efectivo del usuario DENTRO del tenant activo.
 * OWNER (dueno del tenant) se mapea a 'ADMIN' para mostrar todas las opciones.
 * SALES se queda como 'SALES' para mostrar solo las opciones de venta.
 * PLAN_CADUCADO se devuelve como 'GUEST' para ocultar todo.
 */

import { useTenant } from '../context/TenantContext.jsx';

export const useEffectiveRole = () => {
    const { currentTenant } = useTenant();
    const rawRole = currentTenant?.role;
    const status = currentTenant?.status;

    const isBlocked = status === 'EXPIRED' || status === 'CANCELLED' || status === 'SUSPENDED';
    if (isBlocked) return 'GUEST';

    if (rawRole === 'OWNER') return 'ADMIN';
    if (rawRole === 'SALES') return 'SALES';
    return 'GUEST';
};

export const useIsReadOnly = () => {
    const { currentTenant } = useTenant();
    if (!currentTenant) return true;
    const isBlocked = ['EXPIRED', 'CANCELLED', 'SUSPENDED'].includes(currentTenant.status);
    return isBlocked || currentTenant.isReadOnly === true;
};

export const usePlanExpired = () => {
    const { currentTenant } = useTenant();
    if (!currentTenant) return true;
    return currentTenant.status === 'EXPIRED' || currentTenant.status === 'CANCELLED' || currentTenant.status === 'SUSPENDED';
};
