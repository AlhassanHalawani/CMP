import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { recordMetric, getClubSummary, getLeaderboard, getStudentKpi, computeKpi, getOverview } from '../controllers/kpi.controller';

const router = Router();

router.get('/overview', authenticate, requireRole('admin', 'club_leader'), getOverview);
router.get('/leaderboard', getLeaderboard);
router.get('/students', authenticate, requireRole('admin', 'club_leader'), getStudentKpi);
router.get('/club/:clubId', getClubSummary);
router.post('/', authenticate, requireRole('admin', 'club_leader'), recordMetric);
router.post('/compute', authenticate, requireRole('admin'), computeKpi);

export default router;
