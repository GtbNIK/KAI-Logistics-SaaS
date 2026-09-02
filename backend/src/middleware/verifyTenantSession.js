/**
 * verifyTenantSession - Cross-check entre el tenant resuelto (header/subdominio)
 * y el tenant activo firmado en el JWT (currentTenantId).
 *
 * Debe usarse DESPUES de verifyToken y tenantResolver, ANTES de requireMembership.
 *
 * Problema que resuelve:
 * El tenant activo viaja en un header controlable por el cliente (X-Tenant-Slug).
 * Un usuario miembro de varios tenants (ej: dueño de produccion + tenant de prueba)
 * podria enviar peticiones con el slug de otro tenant si el frontend se desincroniza
 * (localStorage compartido entre pestañas, switchTenant + peticiones en vuelo, etc).
 * Este middleware garantiza que el header y el JWT apunten al MISMO tenant.
 *
 * Comportamiento:
 * - req.tenant.id !== req.user.currentTenantId -> 403 TENANT_SESSION_MISMATCH.
 * - Tokens legacy sin currentTenantId (null): deja pasar y lo valida requireMembership.
 */

export const verifyTenantSession = (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'No autenticado.' });
    }

    if (!req.tenant || !req.tenant.id) {
        return res.status(400).json({ message: 'Tenant no resuelto.' });
    }

    const sessionTenantId = req.user.currentTenantId;

    // Solo cruzar cuando el JWT efectivamente declara un tenant activo
    if (sessionTenantId && sessionTenantId !== req.tenant.id) {
        return res.status(403).json({
            code: 'TENANT_SESSION_MISMATCH',
            message: 'El tenant activo no coincide con tu sesión. Vuelve a iniciar sesión o cambia de tenant.',
        });
    }

    return next();
};
