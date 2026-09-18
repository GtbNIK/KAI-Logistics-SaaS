import express from 'express';
import {
    adminLogin,
    adminLogout,
    adminGetMe,
    listTenants,
    getTenantDetail,
    createTenant,
    activateTenant,
    suspendTenant,
    unsuspendTenant,
    extendTrial,
    registerPayment,
    listPayments,
    getMetrics,
    runWorker,
    getWorkersInfo,
} from '../controllers/admin.controller.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';

const router = express.Router();

// =============================================================================
// AUTH SUPER-ADMIN (publicas)
// =============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Login de super-admin
 * @access  Public
 */
router.post('/auth/login', adminLogin);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout de super-admin
 * @access  Private
 */
router.post('/auth/logout', requireSuperAdmin, adminLogout);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Info del super-admin actual
 * @access  Private
 */
router.get('/auth/me', requireSuperAdmin, adminGetMe);

// =============================================================================
// RUTAS PROTEGIDAS (requieren requireSuperAdmin)
// =============================================================================

// Auth
router.use(requireSuperAdmin);

// Tenants
router.get('/tenants', listTenants);
router.post('/tenants', createTenant);
router.get('/tenants/:id', getTenantDetail);
router.post('/tenants/:id/activate', activateTenant);
router.post('/tenants/:id/suspend', suspendTenant);
router.post('/tenants/:id/unsuspend', unsuspendTenant);
router.post('/tenants/:id/extend-trial', extendTrial);

// Payments
router.post('/payments', registerPayment);
router.get('/payments', listPayments);

// Metrics
router.get('/metrics', getMetrics);

// Workers (debug)
router.post('/workers/run', runWorker);
router.get('/workers/status', getWorkersInfo);

export default router;
