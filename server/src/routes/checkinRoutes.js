import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { searchGuest, checkIn, checkOut, assignSeat } from '../controllers/checkinController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure local temp directory for multer uploads
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'checkin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed.'));
  }
});

const router = express.Router();

// Both Admins and Bouncers can search and perform check-ins
router.get('/search', authenticate, authorize(['Admin', 'Staff/Bouncer']), searchGuest);
router.post('/', authenticate, authorize(['Admin', 'Staff/Bouncer']), upload.single('photo'), checkIn);
router.post('/checkout', authenticate, authorize(['Admin', 'Staff/Bouncer']), checkOut);
router.patch('/seat', authenticate, authorize(['Admin', 'Staff/Bouncer']), assignSeat);

export default router;
