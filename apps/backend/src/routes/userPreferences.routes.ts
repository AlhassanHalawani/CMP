import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyPreferences, updateMyPreferences } from '../controllers/userPreferences.controller';

const router = Router();

router.use(authenticate);
router.get('/me/preferences', getMyPreferences);
router.patch('/me/preferences', updateMyPreferences);

export default router;
