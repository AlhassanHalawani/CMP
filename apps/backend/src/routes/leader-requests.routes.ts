import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  createLeaderRequest,
  listLeaderRequests,
  listMyLeaderRequests,
  approveLeaderRequest,
  rejectLeaderRequest,
} from '../controllers/leader-requests.controller';

const router = Router();

router.use(authenticate);

router.post('/', createLeaderRequest);
router.get('/mine', listMyLeaderRequests);
router.get('/', requireRole('admin'), listLeaderRequests);
router.patch('/:id/approve', requireRole('admin'), approveLeaderRequest);
router.patch('/:id/reject', requireRole('admin'), rejectLeaderRequest);

export default router;
