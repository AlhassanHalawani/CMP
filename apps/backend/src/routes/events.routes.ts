import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
} from '../controllers/events.controller';

const router = Router();

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', authenticate, requireRole('admin', 'club_leader'), createEvent);
router.patch('/:id', authenticate, requireRole('admin', 'club_leader'), updateEvent);
router.delete('/:id', authenticate, requireRole('admin', 'club_leader'), deleteEvent);
router.post('/:id/register', authenticate, registerForEvent);
router.post('/:id/cancel', authenticate, cancelRegistration);

export default router;
