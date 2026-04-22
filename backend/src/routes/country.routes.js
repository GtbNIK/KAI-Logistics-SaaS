import express from 'express';
import { getCountries, createCountry } from '../controllers/country.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(verifyToken);

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
router.post('/', authorize('ADMIN'), createCountry);

export default router;
