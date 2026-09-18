/**
 * scope.js - Filtro de visibilidad por usuario para roles no privilegiados.
 *
 * OWNER y ADMIN ven todo el tenant. SALES, OPERATOR, VIEWER solo ven
 * registros asignados a ellos (según el campo o relación de asignación del modelo).
 */
const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'];

/**
 * Retorna un fragmento `where` para filtrar por asignación de usuario.
 *
 * @param {'OWNER'|'ADMIN'|'SALES'|'OPERATOR'|'VIEWER'} role
 * @param {string} userId
 * @param {object} fieldMap - Mapeo de modelo -> campo directo (ej. { Quote: 'userId' })
 * @param {object} relationMap - Mapeo de modelo -> relación many-to-many (ej. { Client: 'clientAssignments' })
 * @param {string} modelName - Nombre del modelo
 * @returns {object} Fragmento where para Prisma
 */
export const getScopeFilter = (role, userId, fieldMap, relationMap, modelName) => {
    if (PRIVILEGED_ROLES.includes(role)) {
        return {};
    }

    // Primero buscar relación M:N
    const relation = relationMap?.[modelName];
    if (relation) {
        return { [relation]: { some: { userId } } };
    }

    // Luego buscar campo directo
    const field = fieldMap?.[modelName];
    if (field) {
        return { [field]: userId };
    }

    return {};
};

/**
 * Mapa de campos de asignación directa
 */
export const SCOPE_FIELD_MAP = {
    Quote: 'userId',
    Shipment: 'vendedorId',
    Payable: 'employeeUserId',
    Notification: 'targetUserId',
};

/**
 * Mapa de relaciones M:N de asignación
 */
export const SCOPE_RELATION_MAP = {
    Client: 'clientAssignments',
};