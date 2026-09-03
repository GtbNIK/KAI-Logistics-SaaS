import express from 'express';
import { getCountries, createCountry } from '../controllers/country.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { verifyTenantSession } from '../middleware/verifyTenantSession.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), verifyTenantSession, requireMembership);

/**
 * @route   GET /api/countries
 * @desc    Listar todos los países
 * @access  Private
 */
router.get('/', getCountries);

/**
 * @route   POST /api/countries
 * @desc    Crear un nuevo país
 * @access  Private (ADMIN only)
 */
router.post('/', authorize('OWNER', 'ADMIN'), createCountry);

export default router;
