import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { recordPageView } from '../controllers/analytics.controller';

const router = Router();

// Auth is optional for page view recording — try authenticate but don't block
router.post('/page-view', (req, res, next) => {
  authenticate(req, res, (err) => {
    // swallow auth errors — user may not be logged in
    if (err) return next();
    next();
  });
}, recordPageView);

export default router;
