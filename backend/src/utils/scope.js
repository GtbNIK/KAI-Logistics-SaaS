/**
 * scope.js - Filtro de visibilidad por usuario para roles no privilegiados.
 *
 * OWNER y ADMIN ven todo el tenant. SALES, OPERATOR, VIEWER solo ven
 * registros asignados a ellos (según el campo de asignación del modelo).
 */
const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'];

/**
 * Retorna un fragmento `where` para filtrar por asignación de usuario.
 *
 * @param {'OWNER'|'ADMIN'|'SALES'|'OPERATOR'|'VIEWER'} role
 * @param {string} userId
 * @param {object} fieldMap - Mapeo de modelo -> campo de asignación
 * @param {string} modelName - Nombre del modelo (para lookup en fieldMap)
 * @returns {object} Fragmento where para Prisma ({}) o filtro por userId
 */
export const getScopeFilter = (role, userId, fieldMap, modelName) => {
    if (PRIVILEGED_ROLES.includes(role)) {
        return {}; // Sin filtro, ven todo
    }

    const field = fieldMap[modelName];
    if (!field) {
        return {}; // Modelo sin campo de asignación, no se filtra
    }

    return { [field]: userId };
};

/**
 * Mapa de campos de asignación por modelo.
 * Modelos sin entrada aquí no tienen filtro de scope.
 */
export const SCOPE_FIELD_MAP = {
    Client: 'assignedToId',
    Quote: 'userId',
    Shipment: 'vendedorId',
    Payable: 'employeeUserId',
    Notification: 'targetUserId',
};