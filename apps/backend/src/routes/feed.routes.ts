import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getFeedEvents } from '../controllers/feed.controller';

const router = Router();

router.get('/events', authenticate, getFeedEvents);

export default router;
