import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { list, markRead, markAllRead } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', list);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;
