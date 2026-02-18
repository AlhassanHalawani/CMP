import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  generateEventQr,
  checkIn,
  manualCheckIn,
  getAttendanceList,
  getEventRegistrations,
} from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate);

router.post('/:eventId/qr', requireRole('admin', 'club_leader'), generateEventQr);
router.post('/check-in', checkIn);
router.post('/:eventId/manual', requireRole('admin', 'club_leader'), manualCheckIn);
router.get('/:eventId', requireRole('admin', 'club_leader'), getAttendanceList);
router.get('/:eventId/registrations', requireRole('admin', 'club_leader'), getEventRegistrations);

export default router;
