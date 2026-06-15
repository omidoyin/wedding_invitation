import express from 'express';
import { initializePayment, verifyPayment, getDonations } from '../controllers/paystackController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);

// Dashboard access to see donations
router.get('/donations', authenticate, authorize(['Admin']), getDonations);

export default router;
