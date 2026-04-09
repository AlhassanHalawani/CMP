import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  getStats,
  getAuditLog,
  listSemesters,
  createSemester,
  setActiveSemester,
  deleteSemester,
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', getStats);
router.get('/audit-log', getAuditLog);
router.get('/semesters', listSemesters);
router.post('/semesters', createSemester);
router.patch('/semesters/:id/activate', setActiveSemester);
router.delete('/semesters/:id', deleteSemester);

export default router;
