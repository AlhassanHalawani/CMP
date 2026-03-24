import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { listClubs, getClub, createClub, updateClub, deleteClub, getClubStats, uploadLogo, logoUpload } from '../controllers/clubs.controller';
import {
  joinClub,
  leaveClub,
  listMembers,
  updateMembership,
  getMembership,
} from '../controllers/membership.controller';

const router = Router();

router.get('/', listClubs);
router.get('/:id', getClub);
router.post('/', authenticate, requireRole('admin'), createClub);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateClub);
router.delete('/:id', authenticate, requireRole('admin'), deleteClub);

// Stats & logo
router.get('/:id/stats', getClubStats);
router.post('/:id/logo', authenticate, requireRole('admin', 'club_leader'), logoUpload.single('logo'), uploadLogo);

// Membership routes
router.post('/:id/join', authenticate, joinClub);
router.delete('/:id/membership', authenticate, leaveClub);
router.get('/:id/membership/me', authenticate, getMembership);
router.get('/:id/members', authenticate, requireRole('admin', 'club_leader'), listMembers);
router.patch('/:id/members/:userId', authenticate, requireRole('admin', 'club_leader'), updateMembership);

export default router;
