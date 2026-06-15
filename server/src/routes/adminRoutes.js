import express from 'express';
import { 
  login, 
  createInvite, 
  getInvites, 
  getDashboardStats, 
  exportGuests, 
  getPendingPhotos 
} from '../controllers/adminController.js';
import { moderatePhoto } from '../controllers/galleryController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);

// Admin dashboard actions
router.post('/invites', authenticate, authorize(['Admin']), createInvite);
router.get('/invites', authenticate, authorize(['Admin', 'Staff/Bouncer']), getInvites);
router.get('/stats', authenticate, authorize(['Admin']), getDashboardStats);
router.get('/export', authenticate, authorize(['Admin']), exportGuests);

// Gallery moderation
router.get('/gallery/pending', authenticate, authorize(['Admin']), getPendingPhotos);
router.put('/gallery/:id/moderate', authenticate, authorize(['Admin']), moderatePhoto);

export default router;
