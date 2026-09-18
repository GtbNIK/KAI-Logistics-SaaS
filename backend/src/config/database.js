/**
 * Prisma Client con Extension multi-tenant.
 *
 * Esta extension intercepta TODAS las operaciones Prisma y:
 * 1. Inyecta automaticamente el tenantId del contexto (AsyncLocalStorage)
 *    en WHERE de find/update/delete y en DATA de create/createMany.
 * 2. Solo aplica el filtro a modelos tenant-scoped.
 * 3. Si no hay tenant en el contexto, NO inyecta nada (rutas publicas/admin).
 *
 * Asi, los controllers pueden escribir:
 *   await prisma.client.findMany()
 * y automaticamente solo obtienen los clientes del tenant activo.
 *
 * IMPORTANTE: Esta extension NO protege contra prisma.$queryRaw (SQL crudo).
 * Para eso se complementa con Row-Level Security (RLS) en Postgres.
 */

import { PrismaClient } from '@prisma/client';
import { getCurrentTenantId } from '../lib/tenantContext.js';

/**
 * Lista de modelos tenant-scoped.
 * Cualquier modelo que tenga el campo tenantId debe estar aqui.
 * Modelo que NO este aqui se considera global (Tenant, User, Plan, SuperAdmin).
 */
const TENANT_SCOPED_MODELS = new Set([
    'Client',
    'Ally',
    'Service',
    'Zone',
    'Port',
    'Country',
    'ShippingLine',
    'AirLine',
    'D2DItem',
    'SvcProvider',
    'ServiceRate',
    'Rate',
    'Quote',
    'QuoteItem',
    'DeliveryNote',
    'DeliveryNoteItem',
    'PaymentNotice',
    'PaymentNoticeItem',
    'Shipment',
    'ShipmentContainer',
    'D2DShipmentItem',
    'Receivable',
    'Payable',
    'PayableTransaction',
    'PaymentTransaction',
    'PaymentReceipt',
    'Notification',
    'Membership',
    'Subscription',
    'Payment',
    'CompanySettings',
    'AuditLog',
]);

/**
 * Operaciones de creacion donde hay que inyectar tenantId en `data`.
 */
const CREATE_OPERATIONS = new Set([
    'create',
    'createMany',
    'upsert',
    'createManyAndReturn',
]);

/**
 * Operaciones de lectura/escritura donde hay que inyectar tenantId en `where`.
 */
const WHERE_OPERATIONS = new Set([
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
    'count',
    'aggregate',
    'groupBy',
]);

const createClient = () => new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const globalForPrisma = globalThis;

const basePrisma = globalForPrisma.__prisma ?? createClient();
globalForPrisma.__prisma = basePrisma;

/**
 * Prisma Client extendido con scoping automatico por tenant.
 * Este es el cliente que debe importarse en TODA la app:
 *   import prisma from '../config/database.js';
 */
const prisma = basePrisma.$extends({
    name: 'multi-tenant-scope',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const tenantId = getCurrentTenantId();

                // Solo actuar si hay tenant en el contexto y el modelo es tenant-scoped
                if (!tenantId || !TENANT_SCOPED_MODELS.has(model)) {
                    return query(args);
                }

                const newArgs = { ...(args || {}) };

                // Inyectar tenantId en data (operaciones de creacion)
                if (CREATE_OPERATIONS.has(operation)) {
                    if (operation === 'createMany') {
                        if (Array.isArray(newArgs.data)) {
                            newArgs.data = newArgs.data.map((item) => ({
                                ...item,
                                tenantId,
                            }));
                        } else if (newArgs.data) {
                            newArgs.data = { ...newArgs.data, tenantId };
                        }
                    } else if (operation === 'upsert') {
                        newArgs.create = { ...(newArgs.create || {}), tenantId };
                        if (newArgs.update && Object.keys(newArgs.update).length > 0) {
                            newArgs.where = { ...(newArgs.where || {}), tenantId };
                        }
                    } else {
                        newArgs.data = { ...(newArgs.data || {}), tenantId };
                    }
                }

                // Inyectar tenantId en where (operaciones de lectura/modificacion)
                if (WHERE_OPERATIONS.has(operation)) {
                    if (newArgs.where) {
                        if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
                            // findUnique no acepta where compound, hay que usar findFirst
                            newArgs.where = { ...newArgs.where, tenantId };
                        } else {
                            newArgs.where = { ...newArgs.where, tenantId };
                        }
                    } else {
                        newArgs.where = { tenantId };
                    }
                }

                return query(newArgs);
            },
        },
    },
});

export default prisma;
