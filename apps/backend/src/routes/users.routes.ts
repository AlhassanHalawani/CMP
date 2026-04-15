import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { getMe, updateMe, listUsers, updateUserRole, recordLoginActivity } from '../controllers/users.controller';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.post('/me/login-activity', recordLoginActivity);
router.get('/', requireRole('admin'), listUsers);
router.patch('/:id/role', requireRole('admin'), updateUserRole);

export default router;
