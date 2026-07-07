import express from 'express';
import { uploadPhoto, getApprovedPhotos } from '../controllers/galleryController.js';

const router = express.Router();

router.get('/', getApprovedPhotos);
router.post('/upload', uploadPhoto);

export default router;
