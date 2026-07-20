# PLAN MAESTRO: KAI-Logistics-SaaS

> Documento de arquitectura y producto. Fuente de verdad para la transformación del ERP single-tenant "Import Services" a SaaS multi-tenant de logística.
>
> **Cliente piloto:** Antonio Crecente (Plan Base aprobado)
> **Stack:** React 19 + Vite + Node.js + Express 5 + Prisma 6 + PostgreSQL (Supabase)
> **Deploy:** Vercel (front) + Railway/Render (back) + Supabase (DB)

---

## Tabla de Contenidos

1. [Decisiones Arquitectónicas Cerradas](#1-decisiones-arquitectónicas-cerradas)
2. [Planes Comerciales](#2-planes-comerciales)
3. [Términos Comerciales](#3-términos-comerciales)
4. [Mapeo Técnico: Cada Límite → Campo en BD](#4-mapeo-técnico-cada-límite--campo-en-bd)
5. [Cambios Arquitectónicos Clave](#5-cambios-arquitectónicos-clave)
6. [Modelo de Datos Multi-Tenant](#6-modelo-de-datos-multi-tenant)
7. [Panel Admin (KAI Control)](#7-panel-admin-kai-control)
8. [Lógica de Negocio Clave](#8-lógica-de-negocio-clave)
9. [Roadmap en 5 Fases](#9-roadmap-en-5-fases)
10. [Estructura de Archivos del Proyecto](#10-estructura-de-archivos-del-proyecto)
11. [Plan de Acción del Primer Sprint](#11-plan-de-acción-del-primer-sprint)
12. [Riesgos Identificados](#12-riesgos-identificados)
13. [Pendientes Menores](#13-pendientes-menores)

---

## 1. Decisiones Arquitectónicas Cerradas

| Aspecto | Decisión |
|---|---|
| **Aislamiento de datos** | Schema único + `tenantId` en TODAS las tablas + Row-Level Security (RLS) en Postgres |
| **Catálogos** | 100% tenant-scoped (Service, Zone, Port, Country, ShippingLine, AirLine, D2DItem, SvcProvider). No hay catálogos globales. |
| **Autenticación** | JWT con `currentTenantId` + middleware `requireMembership` |
| **Resolución de tenant** | Header `X-Tenant-Slug` (dev) → subdominio `*.kai-logistics.app` (producción, Fase 5) |
| **ORM** | Prisma 6 con Client Extensions para scoping automático |
| **Billing** | **Manual** vía pago móvil. Panel admin activa/suspende tenants. Sin Stripe. |
| **Aprobación de tenants** | Trial automático **10 días** → expiración automática → activación manual tras pago confirmado por el admin |
| **Super-admin** | Modelo `SuperAdmin` global (sin `tenantId`). Login separado en `/admin/login` |
| **Multi-moneda** | Disponible en **ambos planes** (Base y Pro) por ahora. En el futuro se migrará a Pro-only. |
| **Conteo de documentos** | **Conteo único**: una cotización convertida a Aviso de Cobro cuenta como UN solo documento (el aviso). |
| **Soporte** | Solo botón "Contactar soporte" en la UI. Los datos de contacto del desarrollador (Neil) NO quedan hardcodeados en el sistema. |
| **Deploy** | **Producción:** Vercel (front) + Railway (back) + Supabase (DB prod). **Desarrollo:** Vercel (otro proyecto) + Render (back) + Supabase (DB dev). |
| **Cliente piloto** | Tenant demo `antonio-crecente` con Plan Base activado. Datos de prueba. |
| **Reset de branding** | Eliminar TODO dato hardcodeado de "Import Services" (nombres, RIF, teléfonos, correos, datos bancarios). Reemplazar por defaults neutros. |
| **Migración del ERP** | Copia limpia: reescribir el ERP completo desde cero con el modelo multi-tenant. No in-place. |

---

## 2. Planes Comerciales

### 2.1 Onboarding (Pago Único): $80 USD

| Concepto | Detalle |
|---|---|
| **Monto** | $80 USD (tasa BCV del día) |
| **Incluye** | Personalización a marca del tenant + inducción por Zoom/presencial + ajuste de formularios al flujo aduanal del cliente + despliegue en la nube |
| **Forma de pago** | 50% anticipo ($40) para iniciar + 50% contra entrega ($40) al finalizar inducción |
| **Nota** | La primera mensualidad se factura con la entrega |

### 2.2 Suscripción Mensual

La suscripción mensual cubre:
- Derecho de uso de la plataforma
- Mantenimiento preventivo del sistema
- Almacenamiento seguro de datos en servidores de alta velocidad
- Respaldos automáticos
- Soporte técnico continuo (Lun-Vie 9:00-17:00 vía WhatsApp/Email)

### 2.3 Plan Base — $49.99 USD/mes ✅ (Antonio Crecente lo aprobó)

| Concepto | Límite |
|---|---|
| Usuarios máximos | 5 |
| Documentos/mes (Cotizaciones + Avisos de Cobro combinados) | 200 (conteo único) |
| Embarques activos en tracking | 80 |
| Dashboard + reportes mensuales | Incluido |
| Multi-moneda | Incluido (USD, ARS, EUR, GBP, BRL, CNY) |
| White-label | NO disponible |

### 2.4 Plan Pro — $64.99 USD/mes

| Concepto | Límite |
|---|---|
| Usuarios máximos | 10 |
| Documentos/mes combinados | 360 (conteo único) |
| Embarques activos en tracking | 150 |
| Dashboard + reportes mensuales | Incluido |
| Multi-moneda | Incluido |
| White-label | Incluido (logo + colores custom) |

### 2.5 Tabla Resumen de Límites

| Recurso | Plan Base | Plan Pro |
|---|---|---|
| Usuarios | 5 | 10 |
| Documentos/mes | 200 | 360 |
| Embarques activos | 80 | 150 |
| White-label | ❌ | ✅ |

---

## 3. Términos Comerciales

- **Período Mínimo de Permanencia:** 6 meses consecutivos a partir de la entrega de la plataforma.
- **Cláusula de Cancelación Anticipada:** Si el cliente cancela antes de cumplir los 6 meses, deberá abonar las mensualidades restantes para completar el semestre de fidelización.
- **Finalización del Período:** Tras los 6 meses, el cliente adquiere total flexibilidad. Puede pausar o dar de baja libremente, sin penalización, con notificación anticipada.
- **Política de Prórroga y Suspensión Temporal:** Al vencer la mensualidad sin pago, se otorgan **3 días continuos de gracia** para regularizar. Pasado ese plazo, el acceso se suspende temporalmente. Las funciones se restablecen automáticamente al procesar la renovación, sin pérdida de información.
- **Condiciones de Aceptación:** Para iniciar formalmente la personalización, se requiere aprobación del documento + 50% del costo de onboarding ($40 USD).
- **Horario de soporte:** 9:00 a.m. - 5:00 p.m. por WhatsApp/Email.

---

## 4. Mapeo Técnico: Cada Límite → Campo en BD

| Límite del plan | Cómo se cuenta en el sistema | Dónde validar |
|---|---|---|
| **Usuarios** | `SELECT COUNT(*) FROM memberships WHERE tenantId = ? AND status = 'ACTIVE'` | Middleware `enforcePlanLimits` en endpoints de invitación/creación |
| **Documentos/mes** | `count(Quote con status ≠ CONVERTED) + count(PaymentNotice)` del mes actual | Middleware en `POST /quotes` y `POST /payment-notices` |
| **Embarques activos** | `SELECT COUNT(*) FROM shipments WHERE tenantId = ? AND status NOT IN ('DELIVERED')` | Middleware en `POST /shipments` |

### 4.1 Nota Crítica: Conteo Único de Documentos

- Una **Cotización en status DRAFT, SENT, APPROVED o REJECTED** → cuenta como 1 documento.
- Una **Cotización en status CONVERTED** → NO cuenta (porque ya evolucionó a Aviso de Cobro).
- Un **PaymentNotice (Aviso de Cobro)** → SIEMPRE cuenta como 1 documento.

---

## 5. Cambios Arquitectónicos Clave

### 5.1 Catálogos: de Globales a Tenant-Scoped

Cada empresa tendrá sus propios catálogos:

| Modelo | Tenant-Scoped |
|---|---|
| Service | ✅ |
| Zone | ✅ |
| Port | ✅ |
| Country | ✅ |
| ShippingLine | ✅ |
| AirLine | ✅ |
| D2DItem | ✅ |
| SvcProvider | ✅ |

**Implicaciones:**
- Cada tenant arranca con un seed mínimo propio (puertos principales Venezuela-China, zonas base, etc.).
- RLS habilitado en TODAS las tablas sin excepciones.
- **Todo lleva `tenantId`** (no hay capa global).

### 5.2 Panel Admin (KAI Control) — Nuevo

Construido desde cero. No existía en el ERP anterior.

**Acceso:**
- URL prod: `kai-logistics.app/admin/login`
- URL dev: `localhost:5173/admin/login`
- Auth separada del tenant (modelo `SuperAdmin` con login independiente)

### 5.3 Trial de 10 Días

- Al hacer signup: `tenant.trialEndsAt = NOW() + 10 days`, `status = 'TRIAL'`.
- Worker diario (pg-boss) revisa trials vencidos → `status = 'EXPIRED'`.
- Tenant expirado puede loguear pero solo ve pantalla de "Trial vencido, contáctanos".

### 5.4 Multi-Moneda en Ambos Planes

Disponible en Plan Base y Plan Pro. Las monedas soportadas son: USD, ARS, EUR, GBP, BRL, CNY. En una fase futura se migrará a Pro-only.

### 5.5 Reset de Datos Hardcodeados

**Búsqueda obligatoria en el código actual** para detectar y reemplazar:
- Nombres propios: "Ysmelda Mora", "Antonio Crecente"
- Teléfonos reales: "0412-3334117", "0424-9455398"
- Emails reales: "hrlien23@gmail.com"
- RIF hardcodeado
- Datos bancarios del modelo "Import Services"
- Textos en PDFs que mencionen "Import Services"
- Colores/logo default azul-naranja que apunten a "Import Services"

**Defaults neutros sugeridos (ejemplos simples):**
- Nombre empresa: "Mi Empresa" / "Tu Empresa"
- RIF: campo vacío (obligatorio al primer login)
- Teléfono: vacío
- Datos bancarios: "Banco Ejemplo - 0102-0000-00-0000000000 - Razón Social Ejemplo C.A."
- Colores por default: gris/azul neutro (cada tenant personaliza)

### 5.6 Datos de Soporte: Solo Botón

No se muestran emails ni teléfonos en la UI. Cada tenant tiene un botón "Contactar soporte" que abre WhatsApp/Email con datos configurables (no hardcodeados). Los datos de Neil como desarrollador NO se exponen.

---

## 6. Modelo de Datos Multi-Tenant

### 6.1 Capa Global (sin tenantId)

```
SuperAdmin
├─ id, email, password, name
├─ isActive
├─ totpSecret, totpEnabled (2FA opcional)
└─ createdAt
```

### 6.2 Capa Tenant (todo lleva tenantId)

**Gestión:**
- `Tenant` — id, slug, name, planId, status, trialEndsAt, currentPeriodEnd, settingsId, createdByUserId
- `Plan` — key (BASE/PRO), name, priceUsd
- `Subscription` — tenantId, planId, status, startDate, currentPeriodStart, currentPeriodEnd, nextPaymentDueAt
- `Payment` — tenantId, amountUsd, method (PAGO_MOVIL/ZELLE/EFECTIVO/TRANSFERENCIA), reference, periodStart, periodEnd, confirmedById, confirmedAt
- `User` — email UNIQUE, password, name, phone (sin tenantId; vive en memberships)
- `Membership` — userId, tenantId, role (OWNER/ADMIN/SALES/OPERADOR), status, invitedById, joinedAt
- `CompanySettings` — companyName, rif, logoUrl, primaryColor, secondaryColor, paymentInfo, pdfBackgrounds, headerText, footerText (1:1 con Tenant)

**Modelos de Negocio (todos con tenantId):**
- `Client` — internalCode, name, rifOrId, email, phone, address, deliveryAddress, contactPerson, referencePoint, clientDetails, deactivationNote, creditBalance, isActive, deletedAt
- `Ally` — internalCode, name, rifOrId, contactInfo, address, isActive, deletedAt
- `Service` — code, name, type, notes, isActive
- `Zone` — internalCode, name, description, isActive
- `Port` — code, name, isActive
- `Country` — name, code
- `ShippingLine` — name, code, isActive
- `AirLine` — name, code (IATA), isActive
- `D2DItem` — description, ...
- `SvcProvider` — name, ...
- `ServiceRate` — allyId, serviceId, zoneId, costPrice, salePrice, originPort, destinationPort, shippingLine, validFrom, validUntil, currency
- `Rate` — region, allyId, countryId, originPortIds[], destinationPortIds[], cost20ft, cost40ft, sale20HC, sale40HC, shippingLineId, freeDays, validFrom, validUntil, isActive, deletedAt

**Operaciones:**
- `Quote` — number, date, validUntil, status, clientId, userId, totalAmount, currency, notes, showNotesToClient
- `QuoteItem` — quoteId, serviceId, quantity, unitPrice, totalPrice, description, allyId, zoneId, originPort, destinationPort, shippingLineId, airLineId
- `DeliveryNote` — number, date, status, warehouseNumber, clientId, quoteId, deliveredTo, contactPhone, deliveryAddress, notes, deletedAt
- `DeliveryNoteItem` — deliveryNoteId, d2dItemId, description, quantity, weight, cbm
- `PaymentNotice` — number, issueDate, quoteId, clientId, totalAmount, currency, notes
- `PaymentNoticeItem` — paymentNoticeId, serviceId, allyId, zoneId, shippingLineId, airLineId, description, quantity, unitPrice, totalPrice
- `Shipment` — number, paymentNoticeId, type (FCL/D2D/CONSOLIDADO), blNumber, whNumber, bookingNumber, shippingLineId, status, currentLocation, arrivalDate, tracking, pVol, pMax, value, dimensions, clientId, clientName, vendedorId, airLineId, originPort, destPort, etd, eta, transitTime, aliadoId, weight, quantity, cbm, cst, consolidadoManual, transportType, d2dEta, deliveryPlace, d2dTransitTime, d2dAliadoId, consolidadoNumber, arrivalPort, consolidadoTransitTime, updatedById, deletedAt
- `ShipmentContainer` — shipmentId, containerType, quantity
- `D2DShipmentItem` — shipmentId, d2dItemId (tabla pivote N:M)

**Finanzas:**
- `Receivable` — number, paymentNoticeId, clientId, manualNotes, totalAmount, currency, paidAmount, balance, status, deletedAt
- `Payable` — number, invoiceNr, allyId, svcProviderId, employeeUserId, description, currency, amount, paidAmount, balance, status, relatedOperationId, dueDate, deletedAt
- `PayableTransaction` — payableId, amount, date, method, reference, notes
- `PaymentTransaction` — receivableId, amount, overpaymentApplied, date, method, reference, notes
- `PaymentReceipt` — receiptNumber, paymentTransactionId, clientId, amount, paymentMethod, reference, issuedBy

**Otros:**
- `Notification` — title, message, type, isRead, targetUserId, targetRoles[], entityType, entityId
- `AuditLog` — tenantId, userId, action, resourceType, resourceId, before (JSON), after (JSON), ip, userAgent, createdAt

---

## 7. Panel Admin (KAI Control)

### 7.1 Modelo SuperAdmin

Sin tenantId, vive aparte. Login independiente con email+password y opcional TOTP (2FA).

### 7.2 Endpoints del Panel Admin

Todos protegidos con middleware `requireSuperAdmin`.

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/admin/auth/login` | Login con email+password (+TOTP si activo) |
| GET | `/api/admin/tenants` | Lista todos los tenants con filtros (status, plan, trialPorVencer) |
| GET | `/api/admin/tenants/:id` | Detalle: usuarios, membresías, uso de límites, pagos |
| POST | `/api/admin/tenants/:id/activate` | Activa el tenant tras confirmar pago |
| POST | `/api/admin/tenants/:id/suspend` | Suspende (read-only) |
| POST | `/api/admin/tenants/:id/unsuspend` | Reactiva un tenant suspendido |
| POST | `/api/admin/tenants/:id/extend-trial` | Extiende trial N días (caso especial) |
| GET | `/api/admin/payments` | Historial global de pagos |
| POST | `/api/admin/payments` | Registra un pago recibido de un tenant |
| GET | `/api/admin/metrics` | MRR, tenants activos, churn trial, uso promedio |
| POST | `/api/admin/super-admins` | Invita un nuevo super-admin |

### 7.3 Frontend del Panel Admin

- Ruta `(admin)` con layout independiente del dashboard de tenants.
- Diseño denso table-first.
- Tabla de tenants: nombre, plan, status, días restantes de trial, usuarios activos, documentos este mes.
- Vista de detalle con tabs: General, Usuarios, Pagos, Uso/Límites, Auditoría.

---

## 8. Lógica de Negocio Clave

### 8.1 Conteo Único de Documentos

```javascript
// Solo cuentan los documentos "terminales":
// - Cotizaciones en status DRAFT, SENT, APPROVED, REJECTED → cuentan
// - Cotizaciones en status CONVERTED → NO cuentan (ya se convirtió)
// - PaymentNotices (Avisos de Cobro) → SIEMPRE cuentan

const counts = await prisma.$transaction([
    prisma.quote.count({
        where: {
            tenantId,
            status: { not: 'CONVERTED' },
            createdAt: { gte: startOfMonth }
        }
    }),
    prisma.paymentNotice.count({
        where: {
            tenantId,
            createdAt: { gte: startOfMonth }
        }
    })
]);
const totalDocuments = counts[0] + counts[1];
```

### 8.2 Trial de 10 Días

```javascript
// Al signup:
tenant.trialEndsAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
tenant.status = 'TRIAL';

// Worker diario (pg-boss):
// Si trialEndsAt < NOW() AND status = 'TRIAL' → status = 'EXPIRED'
// Si currentPeriodEnd < NOW() AND status = 'ACTIVE' → status = 'PAST_DUE' (3 días gracia)
// Si past_due + 3 días → status = 'SUSPENDED'
```

### 8.3 Middleware `enforcePlanLimits`

```javascript
// Antes de cada operación que consume un recurso:
const limits = await getPlanLimits(tenant.planId);
const usage = await getCurrentUsage(tenant.id);

if (usage.users >= limits.maxUsers) throw new HttpError(403, 'Límite de usuarios alcanzado');
if (usage.documentsMonth >= limits.maxDocumentsMonth) throw new HttpError(403, 'Límite de documentos mensuales alcanzado');
if (usage.shipmentsActive >= limits.maxShipmentsActive) throw new HttpError(403, 'Límite de embarques activos alcanzado');
```

### 8.4 Prisma Client Extension (Scoping Automático)

```javascript
// lib/prisma.js - Inyecta tenantId automáticamente
prisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ args, query }) {
                const tenantId = getCurrentTenantId();
                if (tenantId && args.where) {
                    args.where = { ...args.where, tenantId };
                }
                return query(args);
            }
        }
    }
});
```

### 8.5 RLS en Postgres

```sql
-- Habilitar RLS en tabla
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento
CREATE POLICY "tenant_isolation_policy" ON "Client"
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

El middleware de tenant hace `SET app.current_tenant = '<uuid>'` por request usando `AsyncLocalStorage` o transacciones explícitas.

---

## 9. Roadmap en 5 Fases

| Fase | Nombre | Alcance | Entregable Verificable | Duración |
|---|---|---|---|---|
| 🌱 | **F1 — Cimientos** | Schema multi-tenant completo, Tenant/User/Membership/Plan/Subscription/Payment, SuperAdmin, signup+login+tenantResolver, middleware requireMembership+enforcePlanLimits, módulo Clients con Prisma Extension, panel admin básico (login+lista+activar/suspender), seed con 2-3 tenants demo incluyendo `antonio-crecente` Plan Base | Funciona end-to-end: crear tenant → trial 10 días → login → ver clientes aislados entre tenants | 4-5 sem |
| 🌿 | **F2 — Defensa** | RLS en TODAS las tablas, `SET app.current_tenant` por request, audit log, tests de aislamiento automatizados | Validación automática: tenant A NUNCA ve datos de tenant B | 2-3 sem |
| 🌳 | **F3 — Billing + Catálogos** | CRUD de catálogos tenant-scoped (Service, Zone, Port, etc.), panel admin completo (registrar pago, métricas), worker de trial expired robusto | Flujo completo: signup → trial → registrar pago → activar → operar | 2-3 sem |
| 🚀 | **F4 — Migración ERP** | Quotes, PaymentNotices, Shipments, Receivables, Payables, DeliveryNotes, PDF exports | Feature parity con el ERP original pero multi-tenant | 5-6 sem |
| 🌌 | **F5 — Producción** | Subdominios reales (DNS wildcard + cert), onboarding wizard, invitaciones email, white-label completo, dominio `kai-logistics.app` comprado y configurado | Producto vendible públicamente | 2-3 sem |

**Total estimado: 16-21 semanas (4-5 meses).**

---

## 10. Estructura de Archivos del Proyecto

### 10.1 Backend

```
backend/
├── prisma/
│   ├── schema.prisma                          # Reescritura completa multi-tenant
│   ├── migrations/                            # Incluye habilitación RLS
│   └── seed.js                                # Tenants demo + planes
└── src/
    ├── config/
    │   ├── env.js
    │   ├── db.js
    │   └── plans.config.js                    # ⭐ Límites de planes centralizados
    ├── lib/
    │   ├── prisma.js                          # ⭐ Prisma Client con Extension
    │   └── tenantContext.js                   # ⭐ AsyncLocalStorage
    ├── middleware/
    │   ├── auth.js                            # JWT
    │   ├── tenantResolver.js                  # ⭐ Lee X-Tenant-Slug
    │   ├── requireMembership.js               # ⭐ Valida membership user-tenant
    │   ├── enforcePlanLimits.js               # ⭐ Feature gating
    │   ├── requireSuperAdmin.js               # ⭐ Auth separada para /admin
    │   └── auditLog.js
    ├── modules/
    │   ├── auth/
    │   ├── tenants/
    │   ├── users/
    │   ├── admin/                             # ⭐ Panel admin KAI Control
    │   ├── clients/                           # ⭐ Primer CRUD multi-tenant
    │   ├── allies/
    │   ├── catalog/                           # Service, Zone, Port, etc.
    │   ├── rates/
    │   ├── quotes/
    │   ├── shipments/
    │   ├── finance/
    │   ├── notifications/
    │   └── settings/
    ├── workers/
    │   └── trialExpiration.js                 # pg-boss job
    └── server.js
```

### 10.2 Frontend

```
frontend/
├── public/
└── src/
    ├── app/
    │   ├── (marketing)/                       # kai-logistics.app (landing)
    │   ├── (admin)/                           # ⭐ Panel admin KAI Control
    │   │   ├── login/
    │   │   ├── layout.jsx
    │   │   ├── tenants/
    │   │   │   ├── page.jsx                   # Lista
    │   │   │   └── [id]/page.jsx              # Detalle
    │   │   └── payments/
    │   ├── (auth)/                            # Login, signup, forgot
    │   ├── (onboarding)/                      # Wizard inicial post-signup
    │   └── (app)/                             # Dashboard protegido
    ├── features/
    │   ├── auth/
    │   ├── tenants/
    │   ├── clients/
    │   └── ...
    ├── components/                            # UI compartido
    ├── lib/
    │   ├── api.js                             # axios con interceptor tenant
    │   ├── authContext.jsx
    │   ├── tenantContext.jsx
    │   └── adminAuthContext.jsx               # ⭐ Auth separada
    └── styles/
```

---

## 11. Plan de Acción del Primer Sprint (Fase 1)

1. **Escribir el nuevo `schema.prisma`** con todos los modelos multi-tenant.
2. **Configurar `lib/prisma.js`** con la Prisma Client Extension para scoping automático.
3. **Crear los middlewares** (`tenantResolver`, `requireMembership`, `enforcePlanLimits`, `requireSuperAdmin`).
4. **Crear los endpoints de auth** (signup idempotente, login, switch-tenant).
5. **Crear el módulo admin básico** (login, lista de tenants, activar/suspender, extender trial).
6. **Reescribir el módulo Clients** con multi-tenancy (validar todo el patrón end-to-end).
7. **Seed inicial** con 2-3 tenants demo, incluyendo `antonio-crecente` con Plan Base.
8. **Frontend**: rutas `(admin)` y `(app)` con sus contexts separados.
9. **Tests manuales** desde Postman/Thunder Client: aislamiento cross-tenant.

### 11.1 Verificación de Fin de Fase 1

- [ ] Puedo crear el tenant `antonio-crecente` desde signup.
- [ ] Trial de 10 días configurado automáticamente.
- [ ] Login funciona y devuelve JWT con `currentTenantId`.
- [ ] Crear un cliente en tenant A no aparece en tenant B.
- [ ] El admin puede ver la lista de tenants y activar/suspender.
- [ ] Límites del Plan Base (5 users, 200 docs, 80 embarques) se validan correctamente.

---

## 12. Riesgos Identificados

1. **Conexión Prisma + RLS:** El adapter-pg de Prisma puede tener fricciones con `SET app.current_tenant`. Mitigación: `AsyncLocalStorage` y transacciones explícitas.
2. **Soft delete + RLS:** Validar que las políticas RLS respeten el campo `deletedAt`.
3. **Job de trial expiration:** Si pg-boss se cae, los trials no expiran. Mitigación: cron secundario en Render/Railway como backup.
4. **Migraciones a 2 DBs:** Documentar proceso manual o configurar CI que migre tanto dev como prod.
5. **Datos personales en pagos:** El campo `reference` puede contener info sensible. Considerar cifrado en reposo.
6. **Subdominios en producción:** El certificado wildcard para `*.kai-logistics.app` debe renovarse automáticamente. Let's Encrypt lo hace.
7. **Multi-tenant + Prisma Extension:** Si un developer usa `prisma.$queryRaw`, el filtro automático no aplica. Se necesita convención + linter.

---

## 13. Pendientes Menores

- [ ] Confirmar el email y teléfono que usará el super-admin inicial (Neil).
- [ ] Definir el seed de puertos/zonas base que se creará al signup de un tenant nuevo.
- [ ] Documentar el proceso de migraciones para las 2 DBs (dev y prod).
- [ ] Configurar TOTP para el super-admin en producción.

---

**Documento vivo.** Se actualizará conforme se descubran nuevos detalles en la implementación.
