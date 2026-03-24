import prisma from '../config/database.js';
import { createNotification } from '../controllers/notification.controller.js';

let boss;

export const initPgBoss = async () => {
    try {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.error('DATABASE_URL not found, skipping pg-boss initialization');
            return null;
        }

        const PgBossModule = await import('pg-boss');
        const PgBoss = PgBossModule.PgBoss || PgBossModule.default || PgBossModule;

        // Configuración robusta, el motor creará el esquema pgboss si no existe en la BD.
        boss = new PgBoss(connectionString);
        
        boss.on('error', error => console.error('pg-boss error:', error));

        await boss.start();
        console.log('✅ pg-boss is started and connected to PostgreSQL');

        // Registrar workers (Consumidores)
        await registerWorkers();

        // Encolar trabajos recurrentes (Schedules / Crons)
        // Se ejecuta cada día a las 06:00 UTC
        await boss.schedule('check-expirations', '0 6 * * *');
        
        // Auto-run para pruebas del usuario (se puede quitar después, descomentar la linea de abajo para probar las notificaciones del pg-boss)
        //await boss.send('check-expirations');

        return boss;
    } catch (error) {
        console.error('Error initializing pg-boss:', error);
    }
};

const registerWorkers = async () => {
    // Asegurar que la cola de expiraciones existe antes de empezar a trabajar con ella.
    try {
        await boss.createQueue('check-expirations');
    } catch (e) {
        // console.warn('Cola ya existente o advertencia:', e.message);
    }

    // Definimos qué pasa cuando se emite el job 'check-expirations'
    await boss.work('check-expirations', async (job) => {
        console.log(`[Worker] Corriendo check-expirations (JobID: ${job.id})`);
        try {
            const today = new Date();
            const in3Days = new Date();
            in3Days.setDate(today.getDate() + 3);

            // Solo aquellos validUntil > hoy y <= +3 días
            const expiringRates = await prisma.serviceRate.findMany({
                where: {
                    validUntil: {
                        gt: today,
                        lte: in3Days
                    },
                    ally: {
                        isActive: true
                    }
                },
                include: { ally: true, service: true }
            });

            // Para no repetir una notificación por cada rating del mismo aliado, agrupamos
            const notifiableAllies = new Set();

            for (const rate of expiringRates) {
                if (!notifiableAllies.has(rate.ally.id)) {
                    await createNotification({
                        title: 'Tarifa por Expirar',
                        message: `Una o más tarifas del aliado ${rate.ally.name} expirarán pronto (alrededor del ${rate.validUntil.toLocaleDateString('es-VE')}).`,
                        type: 'WARNING',
                        targetRoles: ['ADMIN', 'SALES'], // Importante para SALES según regla aprobada
                        entityType: 'ALLY',
                        entityId: rate.ally.id
                    });
                    notifiableAllies.add(rate.ally.id);
                }
            }

            // 2. Revisar Cuentas por Pagar (CXP) por Vencer
            // Que no esten pagadas y venzan en los prox 3 dias
            const expiringPayables = await prisma.payable.findMany({
                where: {
                    status: { not: 'PAID' },
                    dueDate: {
                        gt: today,
                        lte: in3Days
                    }
                },
                include: { ally: true, svcProvider: true }
            });

            for (const c of expiringPayables) {
                const beneficiary = c.ally?.name || c.svcProvider?.name || 'Desconocido';
                await createNotification({
                    title: 'Cuenta por Pagar Venciendo',
                    message: `La cuenta de $${c.balance} a ${beneficiary} vence el ${c.dueDate.toLocaleDateString('es-VE')}.`,
                    type: 'WARNING',
                    targetRoles: ['ADMIN'],
                    entityType: 'PAYABLE',
                    entityId: c.id
                });
            }

            // 3. Revisar Embarques FCL próximos a llegar
            const in7Days = new Date();
            in7Days.setDate(today.getDate() + 7);

            const arrivingShipments = await prisma.shipment.findMany({
                where: {
                    type: 'FCL',
                    status: { not: 'DELIVERED' },
                    eta: {
                        gt: today,
                        lte: in7Days
                    }
                }
            });

            for (const shipment of arrivingShipments) {
                await createNotification({
                    title: 'Embarque Próximo a Llegar',
                    message: `La ETA del EMB-${String(shipment.number).padStart(5, '0')} está pronta a llegar a su puerto destino (${shipment.destPort || 'N/A'}).`,
                    type: 'INFO',
                    targetRoles: ['ADMIN'],
                    entityType: 'SHIPMENT',
                    entityId: shipment.id
                });
            }

            console.log(`[Worker] check-expirations finalizado. Procesados: ${notifiableAllies.size} aliados, ${expiringPayables.length} CXP, ${arrivingShipments.length} Embarques.`);
        } catch (error) {
            console.error('[Worker] Error en check-expirations:', error);
            throw error; // Boss re-intentará o registrará el fallo
        }
    });
};

export const getBossInstance = () => boss;
