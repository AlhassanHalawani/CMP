import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { getMe, updateMe, listUsers, updateUserRole, recordLoginActivity, getGamification, getXpHistory, getMyStats, deleteMe, deleteUser } from '../controllers/users.controller';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.post('/me/login-activity', recordLoginActivity);
router.get('/me/gamification', getGamification);
router.get('/me/stats', getMyStats);
router.get('/me/xp-history', getXpHistory);
router.delete('/me', deleteMe);
router.get('/', requireRole('admin'), listUsers);
router.patch('/:id/role', requireRole('admin'), updateUserRole);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;
