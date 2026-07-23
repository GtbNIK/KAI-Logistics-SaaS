/**
 * Workerscheduler - Reemplazo de pg-boss con node-cron.
 *
 * Tres jobs diarios para KAI Logistics SaaS:
 * 1. trialExpiration: marca trials vencidos como EXPIRED,
 *    suscripciones activas con periodo vencido como PAST_DUE,
 *    y PAST_DUE + 3 dias como SUSPENDED.
 *
 * 2. payablesExpiring: notifica a tenants sobre cuentas por pagar
 *    que vencen en los proximos 3 dias.
 *
 * 3. shipmentsArriving: notifica sobre embarques con ETA en los
 *    proximos 7 dias.
 *
 * Ventajas sobre pg-boss:
 * - Sin dependencias externas problematicas con Supabase pooler
 * - Cero configuracion adicional (DATABASE_URL basta)
 * - Si el server reinicia, los crons se vuelven a registrar al arrancar
 * - Sobrevive a caidas del backend con gracia (se ejecuta la proxima vez)
 */

import cron from 'node-cron';
import { runWorkers, stopWorkers, getWorkersStatus } from './index.js';

let initialized = false;

/**
 * Inicializa todos los workers programados.
 * Llamar una sola vez al arrancar el servidor.
 */
export const startWorkers = () => {
    if (initialized) {
        console.warn('[workers] Ya estaban inicializados. Se omiten.');
        return;
    }

    console.log('[workers] Inicializando cron jobs...');

    // Job 1: Trial expirations - todos los dias a las 03:00 AM Venezuela
    cron.schedule('0 3 * * *', () => {
        console.log('[workers] Ejecutando trialExpiration...');
        runWorkers('trialExpiration').catch((err) => {
            console.error('[workers] Error en trialExpiration:', err);
        });
    }, {
        timezone: 'America/Caracas',
    });

    // Job 2: Payables expirando - todos los dias a las 07:00 AM Venezuela
    cron.schedule('0 7 * * *', () => {
        console.log('[workers] Ejecutando payablesExpiring...');
        runWorkers('payablesExpiring').catch((err) => {
            console.error('[workers] Error en payablesExpiring:', err);
        });
    }, {
        timezone: 'America/Caracas',
    });

    // Job 3: Shipments por llegar - todos los dias a las 08:00 AM Venezuela
    cron.schedule('0 8 * * *', () => {
        console.log('[workers] Ejecutando shipmentsArriving...');
        runWorkers('shipmentsArriving').catch((err) => {
            console.error('[workers] Error en shipmentsArriving:', err);
        });
    }, {
        timezone: 'America/Caracas',
    });

    initialized = true;

    console.log('[workers] Cron jobs inicializados:');
    console.log('  - trialExpiration:    03:00 AM America/Caracas (diario)');
    console.log('  - payablesExpiring:   07:00 AM America/Caracas (diario)');
    console.log('  - shipmentsArriving:  08:00 AM America/Caracas (diario)');
};

/**
 * Detiene todos los workers (uso en tests/shutdown).
 */
export const shutdownWorkers = () => {
    stopWorkers();
    initialized = false;
};

/**
 * Devuelve el estado actual de los workers.
 */
export const getWorkersInfo = () => {
    return {
        initialized,
        status: getWorkersStatus(),
    };
};
