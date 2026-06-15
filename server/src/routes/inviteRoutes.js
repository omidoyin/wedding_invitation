import express from 'express';
import { getInviteByToken } from '../controllers/inviteController.js';

const router = express.Router();

router.get('/:token', getInviteByToken);

export default router;
