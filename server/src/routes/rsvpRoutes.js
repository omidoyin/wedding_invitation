import express from 'express';
import { submitRSVP } from '../controllers/rsvpController.js';

const router = express.Router();

router.post('/', submitRSVP);

export default router;
