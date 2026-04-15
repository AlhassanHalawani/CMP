import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { listAll, listForUser, listForClub, create, remove, downloadReport, getMyEngineProgress, getClubEngineProgress } from '../controllers/achievements.controller';

const router = Router();

router.get('/', authenticate, requireRole('admin'), listAll);
router.get('/engine/progress/me', authenticate, getMyEngineProgress);
router.get('/engine/progress/club/:clubId', authenticate, getClubEngineProgress);
router.get('/user/:userId', authenticate, listForUser);
router.get('/user/:userId/report', authenticate, downloadReport);
router.get('/club/:clubId', authenticate, listForClub);
router.post('/', authenticate, requireRole('admin', 'club_leader'), create);
router.delete('/:id', authenticate, requireRole('admin', 'club_leader'), remove);

export default router;
