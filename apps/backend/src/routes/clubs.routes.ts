import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { listClubs, getClub, createClub, updateClub, deleteClub, getClubStats, getClubDashboard, uploadLogo, logoUpload, assignClubLeader } from '../controllers/clubs.controller';
import {
  getMemberRoles,
  joinClub,
  leaveClub,
  listMembers,
  listAssignableMembers,
  updateMembership,
  assignMemberRole,
  getMembership,
} from '../controllers/membership.controller';
import { followClub, unfollowClub, getMyFollow, listFollowers } from '../controllers/clubFollowers.controller';
import { listClubTasks, createClubTask, updateClubTask, deleteClubTask } from '../controllers/clubTasks.controller';

const router = Router();

// Role catalog
router.get('/member-roles', authenticate, getMemberRoles);

router.get('/', listClubs);
router.get('/:id', getClub);
router.post('/', authenticate, requireRole('admin'), createClub);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateClub);
router.delete('/:id', authenticate, requireRole('admin'), deleteClub);

// Admin: assign club leader
router.post('/:id/assign-leader', authenticate, requireRole('admin'), assignClubLeader);

// Stats & logo
router.get('/:id/stats', getClubStats);
router.get('/:id/dashboard', authenticate, requireRole('admin', 'club_leader'), getClubDashboard);
router.post('/:id/logo', authenticate, requireRole('admin', 'club_leader'), logoUpload.single('logo'), uploadLogo);

// Membership routes
router.post('/:id/join', authenticate, joinClub);
router.delete('/:id/membership', authenticate, leaveClub);
router.get('/:id/membership/me', authenticate, getMembership);
router.get('/:id/members', authenticate, requireRole('admin', 'club_leader'), listMembers);
router.get('/:id/members/assignable', authenticate, requireRole('admin', 'club_leader'), listAssignableMembers);
router.patch('/:id/members/:userId', authenticate, requireRole('admin', 'club_leader'), updateMembership);
router.patch('/:id/members/:userId/role', authenticate, requireRole('admin', 'club_leader'), assignMemberRole);

// Follower routes
router.post('/:id/follow', authenticate, followClub);
router.delete('/:id/follow', authenticate, unfollowClub);
router.get('/:id/follow/me', authenticate, getMyFollow);
router.get('/:id/followers', authenticate, requireRole('admin', 'club_leader'), listFollowers);

// Task routes
router.get('/:id/tasks', authenticate, requireRole('admin', 'club_leader'), listClubTasks);
router.post('/:id/tasks', authenticate, requireRole('admin', 'club_leader'), createClubTask);
router.patch('/:id/tasks/:taskId', authenticate, updateClubTask);
router.delete('/:id/tasks/:taskId', authenticate, requireRole('admin', 'club_leader'), deleteClubTask);

export default router;
