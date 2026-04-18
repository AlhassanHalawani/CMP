import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getCatalog, getMyBadges, getMyProgress, patchFeaturedBadge } from '../controllers/badges.controller';

const router = Router();

router.get('/catalog', authenticate, getCatalog);
router.get('/me', authenticate, getMyBadges);
router.get('/me/progress', authenticate, getMyProgress);
router.patch('/me/featured', authenticate, patchFeaturedBadge);

export default router;
