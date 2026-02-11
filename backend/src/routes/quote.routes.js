import express from 'express';
import * as quoteController from '../controllers/quote.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Rutas
router.get('/', authorize('ADMIN', 'SALES'), quoteController.getQuotes);
router.get('/next-number', authorize('ADMIN', 'SALES'), quoteController.getNextQuoteNumber);
router.get('/:id', authorize('ADMIN', 'SALES'), quoteController.getQuote);
router.post('/', authorize('ADMIN', 'SALES'), quoteController.createQuote);
router.put('/:id', authorize('ADMIN', 'SALES'), quoteController.updateQuote);
router.patch('/:id/status', authorize('ADMIN', 'SALES'), quoteController.updateQuoteStatus);
router.delete('/:id', authorize('ADMIN', 'SALES'), quoteController.deleteQuote);

export default router;
