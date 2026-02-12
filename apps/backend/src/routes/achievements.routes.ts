import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { listForUser, listForClub, create, remove, downloadReport } from '../controllers/achievements.controller';

const router = Router();

router.get('/user/:userId', listForUser);
router.get('/user/:userId/report', downloadReport);
router.get('/club/:clubId', listForClub);
router.post('/', authenticate, requireRole('admin', 'club_leader'), create);
router.delete('/:id', authenticate, requireRole('admin', 'club_leader'), remove);

export default router;
