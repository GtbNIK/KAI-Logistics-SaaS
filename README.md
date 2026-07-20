# KAI Logistics SaaS - Guía de Arranque

> ERP multi-tenant de logística. Conversión del antiguo "Import Services" a SaaS.

---

## 📋 Pre-requisitos

- **Node.js** 18+
- **PostgreSQL** 14+ (local o Supabase)
- **npm** 9+
- Dos bases de datos en Supabase (o dos PostgreSQL locales):
  - Una para **desarrollo** (`erp_logistica_dev`)
  - Una para **producción** (`erp_logistica_prod`)

---

## 🔧 Setup Inicial

### 1. Backend

```bash
cd backend
npm install
```

Configura tu `.env` (copia `.env.example` → `.env`):

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.TU_REF.supabase.co:5432/postgres"
JWT_SECRET="genera_un_secreto_seguro_aqui"
JWT_EXPIRES_IN="1h"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
SUPABASE_URL=https://TU_REF.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key
```

### 2. Aplicar schema multi-tenant

⚠️ **DESTRUCTIVO**: esta migración elimina las tablas del schema anterior.

```bash
# Opcion A: BD limpia (recomendado para empezar)
# En Supabase SQL Editor, ejecuta: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
# Luego:
npx prisma migrate dev --name init_multitenant

# Generar cliente
npx prisma generate

# Seed con planes + super-admin + 3 tenants demo
npx prisma db seed
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

Configura tu `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 4. Arrancar

```bash
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend
cd frontend
npm run dev
```

App corriendo en `http://localhost:5173`.

---

## 🔑 Credenciales de Desarrollo (post-seed)

### Super-Admin (Panel KAI Control)
- **URL:** `http://localhost:5173/admin/login`
- **Email:** `admin@kai.app`
- **Password:** `Admin123!`

### Tenants Demo

| Slug | Email | Password | Plan | Status |
|---|---|---|---|---|
| `antonio-crecente` | `antonio@kai.app` | `Demo123!` | Base | Trial (10 días) |
| `logiven-demo` | `logiven@kai.app` | `Demo123!` | Pro | Active |
| `transcar-test` | `transcar@kai.app` | `Demo123!` | Base | Expired |

### Cómo usar el header `X-Tenant-Slug`

En Postman/Thunder Client, agrega a TODAS las requests autenticadas:
```
X-Tenant-Slug: antonio-crecente
```

El backend lee este header y setea el contexto multi-tenant automáticamente.

---

## 🧪 Pruebas Manuales (Aislamiento Cross-Tenant)

1. Login con `antonio@kai.app` + header `X-Tenant-Slug: antonio-crecente`
2. Crear 3 clientes (`POST /api/clients`)
3. Logout
4. Login con `logiven@kai.app` + header `X-Tenant-Slug: logiven-demo`
5. `GET /api/clients` → debe devolver SOLO los clientes de Logiven
6. Probar que `GET /api/clients/{idClienteAntonio}` desde Logiven → 404

---

## 🏗️ Arquitectura

```
Frontend (Vite + React 19)
  ↓ axios con X-Tenant-Slug
  ↓
Backend (Express 5)
  ├── Middleware tenantResolver → AsyncLocalStorage
  ├── Middleware requireMembership
  ├── Middleware enforcePlanLimits
  ├── Prisma Client Extension (scoping automático)
  ↓
PostgreSQL (Supabase)
  └── tenantId en TODAS las tablas de negocio
```

### Aislamiento en 3 capas

1. **Prisma Client Extension** — Inyecta `tenantId` automáticamente en cada query
2. **Middleware `requireMembership`** — Valida que el user pertenece al tenant
3. **Row-Level Security (RLS)** — Por implementar en Fase 2 (defensa en profundidad)

---

## 📅 Workers (cron jobs)

| Worker | Horario (Venezuela) | Función |
|---|---|---|
| `trialExpiration` | 03:00 AM | Marca trials vencidos como EXPIRED, suscripciones vencidas como PAST_DUE/SUSPENDED |
| `payablesExpiring` | 07:00 AM | Notifica CxP por vencer en 3 días |
| `shipmentsArriving` | 08:00 AM | Notifica embarques con ETA en 7 días |

Ejecutar manualmente (solo super-admin):
```bash
curl -X POST http://localhost:3000/api/admin/workers/run \
  -H "Cookie: admin_token=TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobName": "trialExpiration"}'
```

O desde el panel admin → Métricas → botón "Ejecutar ahora".

---

## 📁 Estructura del Proyecto

```
KAI-Logistics-SaaS/
├── PLAN.md                                  # Plan maestro
├── README.md                                # Este archivo
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                    # Schema multi-tenant
│   │   └── seed.js                          # Seed de planes + 3 tenants demo
│   └── src/
│       ├── config/
│       │   ├── plans.config.js              # Límites de planes
│       │   └── database.js                  # Prisma Client + Extension
│       ├── lib/
│       │   └── tenantContext.js             # AsyncLocalStorage
│       ├── middleware/
│       │   ├── auth.middleware.js           # verifyToken
│       │   ├── tenantResolver.js            # Lee X-Tenant-Slug
│       │   ├── requireMembership.js         # User ↔ Tenant
│       │   ├── enforcePlanLimits.js         # Feature gating
│       │   └── requireSuperAdmin.js         # Auth admin
│       ├── controllers/
│       │   ├── auth.controller.js           # signup, login, switch-tenant
│       │   ├── admin.controller.js          # Panel admin
│       │   └── client.controller.js         # Refactorizado multi-tenant
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── admin.routes.js
│       │   └── client.routes.js
│       └── workers/
│           ├── scheduler.js                 # node-cron setup
│           └── index.js                     # 3 workers (trials, payables, shipments)
└── frontend/
    └── src/
        ├── lib/
        │   └── api.js                       # axios + interceptor X-Tenant-Slug
        ├── context/
        │   ├── AuthContext.jsx              # User + login/logout
        │   ├── TenantContext.jsx            # Tenant activo
        │   └── AdminAuthContext.jsx         # Super-admin
        ├── components/
        │   └── TenantSelector.jsx           # Selector de tenant en header
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   └── admin/
        │       ├── AdminLogin.jsx
        │       ├── AdminLayout.jsx
        │       ├── AdminTenants.jsx
        │       ├── AdminTenantDetail.jsx
        │       ├── AdminPayments.jsx
        │       └── AdminMetrics.jsx
        └── App.jsx                          # Rutas con providers
```

---

## 🚧 Pendiente para Producción

- [ ] **Sprint 1.12** — Pruebas end-to-end en navegador
- [ ] **Fase 2** — Habilitar RLS en Postgres (defensa en profundidad)
- [ ] **Fase 4** — Migrar resto de módulos (Quotes, Shipments, etc.) a multi-tenant
- [ ] **Fase 5** — Subdominios reales (`*.kai-logistics.app`) + DNS wildcard + cert

---

## 📞 Soporte

Para reportar issues o contribuir, contacta al equipo de desarrollo.
