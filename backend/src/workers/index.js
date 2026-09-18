/**
 * Workers - Punto de entrada para ejecutar jobs individuales.
 *
 * Cada funcion `runXxx()` ejecuta su logica de negocio una vez.
 * El scheduler.js decide cuando llamarlas (diariamente con node-cron).
 *
 * Patron: cada worker recorre los tenants activos y procesa sus datos.
 * Como las tablas son tenant-scoped, hacemos un loop por tenant para
 * mantener notificaciones y metricas separadas por organizacion.
 */

import prisma from '../config/database.js';
import { GRACE_PERIOD_DAYS } from '../config/plans.config.js';
import { createNotification } from '../controllers/notification.controller.js';
import { runWithTenant } from '../lib/tenantContext.js';

const VENEZUELA_TZ_OPTS = { timeZone: 'America/Caracas' };

/**
 * Job 1: Trial expirations
 * - Trials vencidos sin conversion → EXPIRED
 * - Suscripciones activas con periodo vencido → PAST_DUE
 * - PAST_DUE con periodo vencido hace > 3 dias → SUSPENDED
 *
 * Tambien notifica al owner del tenant 2 dias antes del vencimiento del trial.
 */
export const runTrialExpiration = async () => {
    const now = new Date();
    const results = {
        trialsExpired: 0,
        subsPastDue: 0,
        subsSuspended: 0,
        trialWarningsSent: 0,
    };

    // 1. Trials vencidos → EXPIRED
    const trialsExpired = await prisma.tenant.updateMany({
        where: {
            status: 'TRIAL',
            trialEndsAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
    });
    results.trialsExpired = trialsExpired.count;

    // 2. Suscripciones activas con periodo vencido → PAST_DUE
    const subsPastDue = await prisma.tenant.updateMany({
        where: {
            status: 'ACTIVE',
            subscription: {
                status: 'ACTIVE',
                currentPeriodEnd: { lt: now },
            },
        },
        data: {
            subscription: {
                update: { status: 'PAST_DUE' },
            },
        },
    });
    results.subsPastDue = subsPastDue.count;

    // 3. PAST_DUE + periodo vencido hace > GRACE_PERIOD_DAYS → SUSPENDED
    const graceDate = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const subsSuspended = await prisma.tenant.updateMany({
        where: {
            status: { in: ['ACTIVE', 'PAST_DUE'] },
            subscription: {
                status: 'PAST_DUE',
                currentPeriodEnd: { lt: graceDate },
            },
        },
        data: {
            subscription: {
                update: { status: 'SUSPENDED' },
            },
        },
    });
    results.subsSuspended = subsSuspended.count;

    // 4. Notificar 2 dias antes del vencimiento del trial
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const trialsAboutToExpire = await prisma.tenant.findMany({
        where: {
            status: 'TRIAL',
            trialEndsAt: {
                gte: tomorrow,
                lte: twoDaysFromNow,
            },
        },
        include: {
            memberships: {
                where: { role: 'OWNER' },
                include: { user: true },
            },
        },
    });

    for (const tenant of trialsAboutToExpire) {
        const owner = tenant.memberships[0];
        if (!owner) continue;

        const daysLeft = Math.ceil(
            (tenant.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        await runWithTenant(tenant.id, async () => {
            await createNotification({
                tenantId: tenant.id,
                title: 'Tu trial está por vencer',
                message: `Tu período de prueba de KAI vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}. Contacta al equipo de KAI para activar tu plan.`,
                type: 'WARNING',
                targetUserId: owner.user.id,
                entityType: 'TENANT',
                entityId: tenant.id,
            });
        });

        results.trialWarningsSent++;
    }

    console.log('[trialExpiration]', results);
    return results;
};

/**
 * Job 2: Payables expirando
 * - Notifica a usuarios con rol ADMIN/OWNER sobre cuentas por pagar
 *   que vencen en los proximos 3 dias.
 * - Una notificacion por cuenta por pagar.
 */
export const runPayablesExpiring = async () => {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const tenants = await prisma.tenant.findMany({
        where: {
            status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] },
        },
        select: { id: true, slug: true, name: true },
    });

    let totalNotifications = 0;

    for (const tenant of tenants) {
        const expiringPayables = await runWithTenant(tenant.id, async () => {
            return prisma.payable.findMany({
                where: {
                    status: { not: 'PAID' },
                    dueDate: {
                        gt: now,
                        lte: in3Days,
                    },
                    deletedAt: null,
                },
                include: {
                    ally: true,
                    svcProvider: true,
                },
            });
        });

        if (expiringPayables.length === 0) continue;

        for (const payable of expiringPayables) {
            const beneficiary = payable.ally?.name || payable.svcProvider?.name || 'Desconocido';

            await runWithTenant(tenant.id, async () => {
                await createNotification({
                    tenantId: tenant.id,
                    title: 'Cuenta por Pagar Venciendo',
                    message: `La cuenta de $${payable.balance} a ${beneficiary} vence el ${payable.dueDate.toLocaleDateString('es-VE', VENEZUELA_TZ_OPTS)}.`,
                    type: 'WARNING',
                    targetRoles: ['ADMIN', 'OWNER'],
                    entityType: 'PAYABLE',
                    entityId: payable.id,
                });
            });

            totalNotifications++;
        }
    }

    console.log(`[payablesExpiring] ${totalNotifications} notificaciones enviadas a ${tenants.length} tenants.`);
    return { notificationsSent: totalNotifications, tenantsProcessed: tenants.length };
};

/**
 * Job 3: Shipments por llegar
 * - Notifica a usuarios con rol ADMIN/OWNER sobre embarques con ETA
 *   en los proximos 7 dias.
 * - Solo aplica a embarques FCL (los D2D no tienen ETA maritima formal).
 */
export const runShipmentsArriving = async () => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const tenants = await prisma.tenant.findMany({
        where: {
            status: { in: ['TRIAL', 'ACTIVE', 'PAST_DUE'] },
        },
        select: { id: true, slug: true, name: true },
    });

    let totalNotifications = 0;

    for (const tenant of tenants) {
        const arrivingShipments = await runWithTenant(tenant.id, async () => {
            return prisma.shipment.findMany({
                where: {
                    type: 'FCL',
                    status: { not: 'DELIVERED' },
                    eta: {
                        gt: now,
                        lte: in7Days,
                    },
                    deletedAt: null,
                },
                select: {
                    id: true,
                    number: true,
                    eta: true,
                    destPort: true,
                },
            });
        });

        if (arrivingShipments.length === 0) continue;

        for (const shipment of arrivingShipments) {
            const shipmentCode = `EMB-${String(shipment.number).padStart(5, '0')}`;

            await runWithTenant(tenant.id, async () => {
                await createNotification({
                    tenantId: tenant.id,
                    title: 'Embarque Próximo a Llegar',
                    message: `La ETA del ${shipmentCode} está próxima (${shipment.destPort || 'puerto por confirmar'}). Fecha estimada: ${shipment.eta.toLocaleDateString('es-VE', VENEZUELA_TZ_OPTS)}.`,
                    type: 'INFO',
                    targetRoles: ['ADMIN', 'OWNER', 'OPERATOR'],
                    entityType: 'SHIPMENT',
                    entityId: shipment.id,
                });
            });

            totalNotifications++;
        }
    }

    console.log(`[shipmentsArriving] ${totalNotifications} notificaciones enviadas a ${tenants.length} tenants.`);
    return { notificationsSent: totalNotifications, tenantsProcessed: tenants.length };
};

/**
 * Estado interno de los workers (para debug/health checks).
 */
const workerStatus = {
    trialExpiration: { lastRun: null, lastError: null },
    payablesExpiring: { lastRun: null, lastError: null },
    shipmentsArriving: { lastRun: null, lastError: null },
};

/**
 * Ejecuta el job indicado por nombre. Usado por el scheduler y por
 * el endpoint de debug /api/admin/workers/run (solo super-admin).
 */
export const runWorkers = async (jobName) => {
    const jobs = {
        trialExpiration: runTrialExpiration,
        payablesExpiring: runPayablesExpiring,
        shipmentsArriving: runShipmentsArriving,
    };

    const jobFn = jobs[jobName];
    if (!jobFn) {
        throw new Error(`Worker desconocido: ${jobName}`);
    }

    try {
        const result = await jobFn();
        workerStatus[jobName] = { lastRun: new Date(), lastError: null };
        return result;
    } catch (error) {
        workerStatus[jobName] = { lastRun: new Date(), lastError: error.message };
        throw error;
    }
};

export const stopWorkers = () => {
    // No hay cleanup especial en node-cron (los tasks viven hasta que el proceso muere)
    console.log('[workers] Workers detenidos.');
};

export const getWorkersStatus = () => workerStatus;
