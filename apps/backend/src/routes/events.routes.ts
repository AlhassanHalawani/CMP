import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  listEvents,
  listEventCategories,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  submitEvent,
  approveEvent,
  rejectEvent,
  exportEventIcs,
  exportCalendarIcs,
} from '../controllers/events.controller';

const router = Router();

// ICS / calendar export — must come before /:id routes
router.get('/calendar.ics', exportCalendarIcs);
router.get('/categories', listEventCategories);

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', authenticate, requireRole('admin', 'club_leader'), createEvent);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateEvent);
router.delete('/:id', authenticate, requireRole('admin', 'club_leader'), deleteEvent);
router.post('/:id/register', authenticate, registerForEvent);
router.post('/:id/cancel', authenticate, cancelRegistration);

// ICS export for individual event
router.get('/:id/ics', exportEventIcs);

// Event approval workflow
router.post('/:id/submit', authenticate, requireRole('club_leader'), submitEvent);
router.post('/:id/approve', authenticate, requireRole('admin'), approveEvent);
router.post('/:id/reject', authenticate, requireRole('admin'), rejectEvent);

export default router;
