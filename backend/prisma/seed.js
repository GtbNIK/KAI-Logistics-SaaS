/**
 * Seed inicial de KAI Logistics SaaS.
 *
 * Crea:
 * - 2 planes (BASE, PRO) sincronizados con plans.config.js
 * - 1 SuperAdmin (Neil) para acceder al panel admin
 * - 3 tenants demo:
 *   1. antonio-crecente (Plan Base, TRIAL 10 dias, cliente piloto real)
 *   2. logiven-demo (Plan Pro, ACTIVE, para probar plan superior)
 *   3. transcar-test (Plan Base, EXPIRED, para probar tenant bloqueado)
 *
 * Para cada tenant: company settings, miembros, clientes demo, catalogos base.
 *
 * Credenciales (solo DEV):
 * - SuperAdmin: admin@kai.app / Admin123!
 * - Antonio:    antonio@kai.app / Demo123!
 * - Logiven:    logiven@kai.app / Demo123!
 * - Transcar:   transcar@kai.app / Demo123!
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PLANS, TRIAL_DURATION_DAYS, GRACE_PERIOD_DAYS } from '../src/config/plans.config.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo123!';
const SUPER_ADMIN_PASSWORD = 'Admin123!';

const log = (msg) => console.log(`[seed] ${msg}`);

const hashPassword = (password) => bcrypt.hash(password, 10);

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40);
};

async function seedPlans() {
    log('Sincronizando planes...');

    for (const [key, plan] of Object.entries(PLANS)) {
        await prisma.plan.upsert({
            where: { key: plan.key },
            update: {
                name: plan.name,
                priceUsd: plan.priceUsd,
                maxUsers: plan.limits.maxUsers,
                maxDocumentsMonth: plan.limits.maxDocumentsMonth,
                maxShipmentsActive: plan.limits.maxShipmentsActive,
                whiteLabelEnabled: plan.features.whiteLabel,
                multiCurrencyEnabled: plan.features.multiCurrency,
            },
            create: {
                key: plan.key,
                name: plan.name,
                priceUsd: plan.priceUsd,
                maxUsers: plan.limits.maxUsers,
                maxDocumentsMonth: plan.limits.maxDocumentsMonth,
                maxShipmentsActive: plan.limits.maxShipmentsActive,
                whiteLabelEnabled: plan.features.whiteLabel,
                multiCurrencyEnabled: plan.features.multiCurrency,
            },
        });
    }

    log(`Planes sincronizados: ${Object.keys(PLANS).join(', ')}`);
}

async function seedSuperAdmin() {
    log('Creando super-admin...');

    const superAdmin = await prisma.superAdmin.upsert({
        where: { email: 'admin@kai.app' },
        update: {},
        create: {
            email: 'admin@kai.app',
            name: 'Neil Rangel',
            password: await hashPassword(SUPER_ADMIN_PASSWORD),
            isActive: true,
        },
    });

    log(`Super-admin listo: ${superAdmin.email} / ${SUPER_ADMIN_PASSWORD}`);
}

async function createTenantWithUser({
    slug,
    companyName,
    email,
    userName,
    planKey,
    status,
    trialDaysRemaining,
    clients = [],
}) {
    const plan = await prisma.plan.findUnique({ where: { key: planKey } });
    if (!plan) {
        throw new Error(`Plan ${planKey} no encontrado. Corre el seed de planes primero.`);
    }

    // Idempotencia: si ya existe el tenant con ese slug, no recreamos
    let tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (tenant) {
        log(`Tenant ${slug} ya existe, omitiendo.`);
        return tenant;
    }

    const now = new Date();
    let trialEndsAt = null;
    let periodStart = now;
    let periodEnd = new Date(now);

    if (status === 'TRIAL' || status === 'EXPIRED') {
        trialEndsAt = new Date(now.getTime() + trialDaysRemaining * 24 * 60 * 60 * 1000);
        periodEnd = trialEndsAt;
    } else {
        periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name: userName,
            password: await hashPassword(DEMO_PASSWORD),
            isActive: true,
        },
    });

    tenant = await prisma.tenant.create({
        data: {
            slug,
            name: companyName,
            status,
            trialEndsAt,
            planId: plan.id,
            createdByUserId: user.id,
        },
    });

    await prisma.subscription.create({
        data: {
            tenantId: tenant.id,
            planId: plan.id,
            status: (status === 'ACTIVE') ? 'ACTIVE' : 'TRIAL',
            startDate: now,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextPaymentDueAt: periodEnd,
        },
    });

    await prisma.membership.create({
        data: {
            userId: user.id,
            tenantId: tenant.id,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: now,
        },
    });

    await prisma.companySettings.create({
        data: {
            tenantId: tenant.id,
            companyName,
        },
    });

    // Catálogos base por tenant
    await seedTenantCatalog(tenant.id);

    // Clientes demo
    for (const clientData of clients) {
        await prisma.client.create({
            data: {
                tenantId: tenant.id,
                ...clientData,
            },
        });
    }

    log(`Tenant ${slug} (${companyName}) - ${planKey} - ${status} - user: ${email}/${DEMO_PASSWORD}`);
    return tenant;
}

async function seedTenantCatalog(tenantId) {
    // Puertos base Venezuela-China
    const ports = [
        { code: 'LGU', name: 'La Guaira' },
        { code: 'MAR', name: 'Maracaibo' },
        { code: 'PUC', name: 'Puerto Cabello' },
        { code: 'SHK', name: 'Shekou' },
        { code: 'SHG', name: 'Shanghai' },
        { code: 'NGH', name: 'Ningbo' },
        { code: 'QIN', name: 'Qingdao' },
    ];
    for (const port of ports) {
        await prisma.port.upsert({
            where: { tenantId_code: { tenantId, code: port.code } },
            update: {},
            create: { tenantId, ...port },
        });
    }

    // Zonas base
    const zones = [
        { internalCode: 'ZON-001', name: 'Zona 1 - Centro', description: 'Caracas y area metropolitana' },
        { internalCode: 'ZON-002', name: 'Zona 2 - Oriente', description: 'Anzoategui, Sucre, Monagas' },
        { internalCode: 'ZON-003', name: 'Zona 3 - Occidente', description: 'Zulia, Merida, Tachira' },
    ];
    for (const zone of zones) {
        await prisma.zone.upsert({
            where: { tenantId_internalCode: { tenantId, internalCode: zone.internalCode } },
            update: {},
            create: { tenantId, ...zone },
        });
    }

    // Paises base
    const countries = [
        { name: 'Venezuela', code: 'VE' },
        { name: 'China', code: 'CN' },
        { name: 'Estados Unidos', code: 'US' },
        { name: 'Mexico', code: 'MX' },
        { name: 'Panama', code: 'PA' },
    ];
    for (const country of countries) {
        await prisma.country.upsert({
            where: { tenantId_name: { tenantId, name: country.name } },
            update: {},
            create: { tenantId, ...country },
        });
    }

    // Servicios base
    const services = [
        { code: 'D2D', name: 'Door to Door', type: 'DOOR_TO_DOOR' },
        { code: 'FCL20', name: 'Contenedor 20ft', type: 'FCL_20' },
        { code: 'FCL40', name: 'Contenedor 40ft', type: 'FCL_40' },
        { code: 'FCL40HC', name: 'Contenedor 40HC', type: 'FCL_40HC' },
        { code: 'LCL', name: 'Carga consolidada', type: 'LCL' },
        { code: 'AIR', name: 'Carga aerea', type: 'AIR' },
        { code: 'CUST', name: 'Aduana', type: 'CUSTOMS' },
    ];
    for (const svc of services) {
        await prisma.service.upsert({
            where: { tenantId_code: { tenantId, code: svc.code } },
            update: {},
            create: { tenantId, ...svc },
        });
    }
}

async function seedTenants() {
    log('Creando tenants demo...');

    await createTenantWithUser({
        slug: 'antonio-crecente',
        companyName: 'Antonio Crecente Logistics',
        email: 'antonio@kai.app',
        userName: 'Antonio Crecente',
        planKey: 'BASE',
        status: 'TRIAL',
        trialDaysRemaining: TRIAL_DURATION_DAYS,
        clients: [
            {
                internalCode: 'CLI-0001',
                name: 'Cliente Demo 1',
                rifOrId: 'J-12345678-0',
                email: 'cliente1@example.com',
                phone: '+584121234567',
                address: 'Av. Principal, Caracas',
                deliveryAddress: 'Av. Principal, Caracas',
                contactPerson: 'Juan Perez',
                referencePoint: 'Cerca del Metro',
            },
            {
                internalCode: 'CLI-0002',
                name: 'Cliente Demo 2',
                rifOrId: 'J-87654321-0',
                email: 'cliente2@example.com',
                phone: '+584147654321',
                address: 'Calle 42, Maracaibo',
                deliveryAddress: 'Calle 42, Maracaibo',
                contactPerson: 'Maria Rodriguez',
                referencePoint: 'Centro',
            },
        ],
    });

    await createTenantWithUser({
        slug: 'logiven-demo',
        companyName: 'Logiven Express',
        email: 'logiven@kai.app',
        userName: 'Logiven Demo',
        planKey: 'PRO',
        status: 'ACTIVE',
        trialDaysRemaining: 0,
        clients: [
            {
                internalCode: 'CLI-0001',
                name: 'Importadora del Centro',
                rifOrId: 'J-11111111-0',
                email: 'importadora@example.com',
                phone: '+584129998877',
                address: 'Zona Industrial, Valencia',
                deliveryAddress: 'Zona Industrial, Valencia',
                contactPerson: 'Carlos Mendez',
                referencePoint: 'Galpon 5',
            },
            {
                internalCode: 'CLI-0002',
                name: 'Distribuidora Norte',
                rifOrId: 'J-22222222-0',
                email: 'norte@example.com',
                phone: '+584146665544',
                address: 'Av. Intercomunal, Barquisimeto',
                deliveryAddress: 'Av. Intercomunal, Barquisimeto',
                contactPerson: 'Ana Suarez',
                referencePoint: 'Al lado de la estacion',
            },
            {
                internalCode: 'CLI-0003',
                name: 'Comercial Oriental',
                rifOrId: 'J-33333333-0',
                email: 'oriental@example.com',
                phone: '+584123332211',
                address: 'Puerto La Cruz',
                deliveryAddress: 'Puerto La Cruz',
                contactPerson: 'Luis Torres',
                referencePoint: 'Frente al puerto',
            },
        ],
    });

    await createTenantWithUser({
        slug: 'transcar-test',
        companyName: 'Transcar Test (Cuenta Expirada)',
        email: 'transcar@kai.app',
        userName: 'Transcar Demo',
        planKey: 'BASE',
        status: 'EXPIRED',
        trialDaysRemaining: -3,
        clients: [],
    });
}

async function main() {
    console.log('==============================================');
    console.log('  KAI Logistics SaaS - Seed Inicial');
    console.log('==============================================');

    await seedPlans();
    await seedSuperAdmin();
    await seedTenants();

    console.log('==============================================');
    console.log('  Seed completado exitosamente');
    console.log('==============================================');
    console.log('');
    console.log('Credenciales DEV:');
    console.log(`  SuperAdmin: admin@kai.app / ${SUPER_ADMIN_PASSWORD}`);
    console.log(`  Antonio:    antonio@kai.app / ${DEMO_PASSWORD}  (Plan Base, TRIAL 10 dias)`);
    console.log(`  Logiven:    logiven@kai.app / ${DEMO_PASSWORD}  (Plan Pro, ACTIVE)`);
    console.log(`  Transcar:   transcar@kai.app / ${DEMO_PASSWORD}  (Plan Base, EXPIRED)`);
    console.log('');
    console.log('Para usar: envia el header X-Tenant-Slug: antonio-crecente');
    console.log('');
}

main()
    .catch((e) => {
        console.error('[seed] Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
