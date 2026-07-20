import express from 'express';
import * as quoteController from '../controllers/quote.controller.js';
import { verifyToken, authorize } from '../middleware/auth.middleware.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { requireMembership } from '../middleware/requireMembership.js';

const router = express.Router();

router.use(verifyToken, tenantResolver(), requireMembership);

router.get('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.getQuotes);
router.get('/next-number', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.getNextQuoteNumber);
router.get('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.getQuote);
router.post('/', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.createQuote);
router.put('/:id', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.updateQuote);
router.patch('/:id/status', authorize('OWNER', 'ADMIN', 'SALES', 'OPERATOR'), quoteController.updateQuoteStatus);
router.delete('/:id', authorize('OWNER', 'ADMIN'), quoteController.deleteQuote);

export default router;
