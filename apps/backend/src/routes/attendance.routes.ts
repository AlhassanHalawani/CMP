import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  generateEventQr,
  checkIn,
  manualCheckIn,
  getAttendanceList,
  getClubAttendanceReport,
  getEventRegistrations,
  openCheckin,
  closeCheckin,
  finalizeCheckin,
} from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate);

// Club-level date-range report — must be before /:eventId to avoid param conflict
router.get('/', requireRole('admin', 'club_leader'), getClubAttendanceReport);

router.post('/:eventId/qr', requireRole('admin', 'club_leader'), generateEventQr);
router.post('/check-in', checkIn);
router.post('/:eventId/manual', requireRole('admin', 'club_leader'), manualCheckIn);
router.get('/:eventId', requireRole('admin', 'club_leader'), getAttendanceList);
router.get('/:eventId/registrations', requireRole('admin', 'club_leader'), getEventRegistrations);
router.post('/:eventId/open', requireRole('admin', 'club_leader'), openCheckin);
router.post('/:eventId/close', requireRole('admin', 'club_leader'), closeCheckin);
router.post('/:eventId/finalize', requireRole('admin', 'club_leader'), finalizeCheckin);

export default router;
