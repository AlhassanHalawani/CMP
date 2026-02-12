import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { listClubs, getClub, createClub, updateClub, deleteClub } from '../controllers/clubs.controller';

const router = Router();

router.get('/', listClubs);
router.get('/:id', getClub);
router.post('/', authenticate, requireRole('admin'), createClub);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateClub);
router.delete('/:id', authenticate, requireRole('admin'), deleteClub);

export default router;
