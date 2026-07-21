# Roadmap: RBAC Dinámico para KAI Logistics

> Documento vivo — NO ejecutar hasta tener 2-3 clientes activos y un sprint dedicado.

## Contexto

Actualmente los permisos están hardcodeados en el código:

- Roles fijos: `OWNER`, `ADMIN`, `SALES`, `OPERATOR`, `VIEWER`
- Autorización vía middleware `authorize('OWNER', 'ADMIN', ...)` en rutas
- Scope de visibilidad hardcodeado en controllers (via `getScopeFilter` en `utils/scope.js`)
- No hay forma de crear roles personalizados por tenant

Esto funciona para el primer cliente, pero no escala.

## Trigger para ejecutar este plan

- 2-3 clientes activos pagados, O
- Un cliente pide crear roles personalizados, O
- El equipo tiene bandwidth para un refactor de 1-2 sprints

## Fases del plan

### Fase 1: Schema (Permission, Role, RolePermission, RoleMembership)

- Crear modelo `Permission` (catálogo global): `id`, `resource`, `action`, `description`
- Crear modelo `Role` (por tenant): `id`, `name`, `description`, `isSystem`, `tenantId`
- Crear modelo pivote `RolePermission`: `roleId`, `permissionId`
- Modificar `Membership`: eliminar `role` (texto), agregar `roleId` → `Role`
- OWNER por defecto tiene TODOS los permisos (bypass en middleware)

**Riesgo:** Migración de datos de `Membership.role` → `Membership.roleId`. Hacer en transacción.

### Fase 2: Seed + Migración de datos

- Script `scripts/seed-rbac.js` que:
  1. Upsert catálogo base de permisos (`QUOTE.CREATE`, `SHIPMENT.READ`, etc.)
  2. Crear roles por defecto (Admin, Vendedor, Operador, Visor) para tenants existentes
  3. Migrar Memberships actuales al nuevo `roleId`
- **Siempre en transacción, con backup previo de BD**

### Fase 3: Middleware `requirePermission(resource, action)`

- Función de orden superior que lee `userId + tenantId` de la request
- Busca en `Membership → Role → RolePermission` si tiene el permiso
- Cache LRU en memoria (TTL 60s) para no saturar BD
- OWNER bypass (no necesita permisos en tabla)

### Fase 4: Endpoint `/auth/me/permissions` + hook frontend `usePermissions`

- Backend expone endpoint que devuelve los permisos efectivos del usuario
- Frontend hook `usePermissions()` que reemplaza `useEffectiveRole()`
- Los componentes esconden botones según `can('QUOTE', 'CREATE')` en vez de `effectiveRole === 'ADMIN'`

### Fase 5: Refactor progresivo de rutas

- Reemplazar `authorize('OWNER', 'ADMIN')` → `requirePermission('QUOTE', 'CREATE')`
- Feature flag por ruta: convivir ambos middlewares durante la migración
- Eliminar `authorize()` y `req.user.role` checks hardcodeados al final

### Fase 6: Limpieza

- Eliminar `MembershipRole` enum del schema (si ya no se usa)
- Eliminar `authorize` middleware legacy
- Eliminar `useEffectiveRole` del frontend
- Documentar API de roles para futuros clientes

## Workaround actual (hardfix de scope)

Mientras tanto, se aplica filtro por `assignedToId` / `userId` / `vendedorId` / `employeeUserId` en controllers de lectura, vía helper `utils/scope.js`.

Este workaround NO requiere migración de roles.

## Riesgos de hacer el refactor en producción

1. Migración de Memberships: siempre en transacción con backup, nunca un viernes
2. Frontend roto si se elimina `useEffectiveRole` antes de tener `usePermissions`
3. Cache de permisos: stale data si un admin cambia roles mientras hay sesiones activas
4. Branch dedicado + dry-run en staging + pruebas con 3 usuarios distintos

## Cuándo revisar este doc

- Trimestralmente
- Cuando aparezca un nuevo cliente grande
- Cuando haya bandwidth para un refactor de 1-2 sprints