import { useEffectiveRole } from './useEffectiveRole';

/**
 * Effective roles con permiso default para quick create.
 * 'ADMIN' cubre OWNER y ADMIN reales (vía useEffectiveRole).
 */
export const QUICK_CREATE_DEFAULT_ROLES = ['ADMIN'];

/**
 * Determina si el usuario puede crear entidades vía QuickCreate.
 * Usa el effectiveRole del usuario (no user.role directo).
 *
 * @param {string[]} [allowedRoles] - Effective roles permitidos
 * @returns {boolean}
 */
export const useCanQuickCreate = (allowedRoles = QUICK_CREATE_DEFAULT_ROLES) => {
    const effectiveRole = useEffectiveRole();
    return allowedRoles.includes(effectiveRole);
};
