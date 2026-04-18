import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  getStudentFeed,
  answerQuestion,
  getMyStreak,
  getMyHistory,
  createDailyQuestion,
  updateDailyQuestion,
  deleteDailyQuestion,
  publishDailyQuestion,
  getManagedQuestions,
} from '../controllers/dailyQuestions.controller';

const router = Router();

// Literal paths must come before parameterized :id routes

// ─── Student routes (all authenticated users) ─────────────────────────────────
router.get('/me/streak', authenticate, getMyStreak);
router.get('/me/history', authenticate, getMyHistory);
router.get('/', authenticate, getStudentFeed);
router.post('/:id/answer', authenticate, answerQuestion);

// ─── Management routes (club_leader + admin) ──────────────────────────────────
router.get('/manage', authenticate, requireRole('admin', 'club_leader'), getManagedQuestions);
router.post('/', authenticate, requireRole('admin', 'club_leader'), createDailyQuestion);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateDailyQuestion);
router.delete('/:id', authenticate, requireRole('admin', 'club_leader'), deleteDailyQuestion);
router.post('/:id/publish', authenticate, requireRole('admin', 'club_leader'), publishDailyQuestion);

export default router;
