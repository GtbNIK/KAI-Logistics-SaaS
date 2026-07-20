/**
 * Configuracion centralizada de planes KAI Logistics SaaS.
 * Single source of truth para limites, precios y features de cada plan.
 *
 * El backend SIEMPRE debe leer los limites desde este archivo,
 * no desde la tabla Plan, para evitar queries extra en cada request.
 * La tabla Plan se mantiene sincronizada via seed.js.
 */

export const PLANS = {
    BASE: {
        key: 'BASE',
        name: 'Plan Base',
        priceUsd: 49.99,
        limits: {
            maxUsers: 5,
            maxDocumentsMonth: 200,
            maxShipmentsActive: 80,
        },
        features: {
            whiteLabel: false,
            multiCurrency: true,
            dashboard: true,
            monthlyReports: true,
        },
        description: 'Plan inicial para empresas de logistica pequenas.',
    },
    PRO: {
        key: 'PRO',
        name: 'Plan Pro',
        priceUsd: 64.99,
        limits: {
            maxUsers: 10,
            maxDocumentsMonth: 360,
            maxShipmentsActive: 150,
        },
        features: {
            whiteLabel: true,
            multiCurrency: true,
            dashboard: true,
            monthlyReports: true,
        },
        description: 'Plan profesional con white-label y mayor capacidad.',
    },
};

export const TRIAL_DURATION_DAYS = 10;
export const GRACE_PERIOD_DAYS = 3;
export const ONBOARDING_FEE_USD = 80.0;
export const ONBOARDING_FEE_HALF_USD = 40.0;

export const CURRENCIES_SUPPORTED = ['USD', 'ARS', 'EUR', 'GBP', 'BRL', 'CNY'];

/**
 * Devuelve los limites del plan por su key.
 * Si el planKey no existe, devuelve los limites del plan BASE como fallback conservador.
 */
export const getPlanLimits = (planKey) => {
    const plan = PLANS[planKey];
    if (!plan) {
        return PLANS.BASE.limits;
    }
    return plan.limits;
};

/**
 * Devuelve el plan completo por su key.
 */
export const getPlan = (planKey) => {
    return PLANS[planKey] || PLANS.BASE;
};

/**
 * Devuelve la lista de features del plan.
 */
export const getPlanFeatures = (planKey) => {
    const plan = PLANS[planKey];
    if (!plan) {
        return PLANS.BASE.features;
    }
    return plan.features;
};

/**
 * Verifica si un plan tiene una feature especifica.
 */
export const planHasFeature = (planKey, featureName) => {
    const features = getPlanFeatures(planKey);
    return features[featureName] === true;
};
