import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { list, markRead, markAllRead, getPreferences, updatePreference } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);

// Preference routes first to avoid /:id catching /preferences
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreference);

router.get('/', list);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;
