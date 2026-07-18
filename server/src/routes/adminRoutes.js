import express from 'express';
import { 
  login, 
  createInvite, 
  getInvites, 
  getDashboardStats, 
  exportGuests, 
  getPendingPhotos,
  getTables,
  createTable,
  updateTable,
  deleteTable,
  assignSeating,
  publishSeating
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

// Seating and Tables Management
router.get('/tables', authenticate, authorize(['Admin', 'Staff/Bouncer']), getTables);
router.post('/tables', authenticate, authorize(['Admin']), createTable);
router.put('/tables/:id', authenticate, authorize(['Admin']), updateTable);
router.patch('/tables/:id', authenticate, authorize(['Admin']), updateTable);
router.delete('/tables/:id', authenticate, authorize(['Admin']), deleteTable);
router.post('/seating/assign', authenticate, authorize(['Admin']), assignSeating);
router.post('/seating/publish', authenticate, authorize(['Admin']), publishSeating);

// Gallery moderation
router.get('/gallery/pending', authenticate, authorize(['Admin']), getPendingPhotos);
router.put('/gallery/:id/moderate', authenticate, authorize(['Admin']), moderatePhoto);
// Shortcut POST routes matching frontend calls: /api/admin/gallery/:id/approve|reject
router.post('/gallery/:id/approve', authenticate, authorize(['Admin']), (req, res, next) => {
  req.body.action = 'approve'; moderatePhoto(req, res, next);
});
router.post('/gallery/:id/reject', authenticate, authorize(['Admin']), (req, res, next) => {
  req.body.action = 'reject'; moderatePhoto(req, res, next);
});

export default router;
