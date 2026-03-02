import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { EventModel } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { ClubModel } from '../models/club.model';
import { logAction } from '../services/audit.service';
import { isAdmin, leaderOwnsClub, leaderOwnsEvent } from '../services/ownership.service';
import { notify, notifyRole } from '../services/notifications.service';

export function listEvents(req: Request, res: Response) {
  const authReq = req as AuthRequest;
  let status = req.query.status as string | undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  // Students (and unauthenticated callers) only see published events
  if (!authReq.user || authReq.user.role === 'student') {
    status = 'published';
  }

  const events = EventModel.list({ status, clubId, limit, offset });
  const total = EventModel.count({ status, clubId });
  res.json({ data: events, total });
}

export function getEvent(req: Request, res: Response) {
  const event = EventModel.findById(parseInt(req.params.id));
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event);
}

export function createEvent(req: AuthRequest, res: Response) {
  const user = req.user!;
  const clubId = req.body.club_id;

  // club_leader can only create events in clubs they own
  if (!isAdmin(user)) {
    if (!clubId || !leaderOwnsClub(user.id, clubId)) {
      res.status(403).json({ error: 'You can only create events in clubs you lead' });
      return;
    }
    // Leaders always start in draft — strip any status from body
    req.body.status = 'draft';
  }

  const data = { ...req.body, created_by: user.id };
  const event = EventModel.create(data);
  logAction({ actorId: user.id, action: 'create', entityType: 'event', entityId: event.id });
  res.status(201).json(event);
}

export function updateEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  const existing = EventModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // club_leader may only update events in clubs they lead
  if (!isAdmin(user)) {
    if (!leaderOwnsEvent(user.id, id)) {
      res.status(403).json({ error: 'You do not have permission to update this event' });
      return;
    }
    // If moving to a different club, leader must also own the target club
    if (req.body.club_id !== undefined && req.body.club_id !== existing.club_id) {
      if (!leaderOwnsClub(user.id, req.body.club_id)) {
        res.status(403).json({ error: 'You do not have permission to move this event to the target club' });
        return;
      }
    }
    // Leaders cannot change status through PATCH — use /submit endpoint
    delete req.body.status;
    delete req.body.rejection_notes;
  }

  const event = EventModel.update(id, req.body);
  logAction({ actorId: user.id, action: 'update', entityType: 'event', entityId: id });
  res.json(event);
}

export function deleteEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  const existing = EventModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // club_leader may only delete events in clubs they lead
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, id)) {
    res.status(403).json({ error: 'You do not have permission to delete this event' });
    return;
  }

  EventModel.delete(id);
  logAction({ actorId: user.id, action: 'delete', entityType: 'event', entityId: id });
  res.status(204).send();
}

export async function submitEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const user = req.user!;

  const event = EventModel.findById(id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (!leaderOwnsEvent(user.id, id)) {
    res.status(403).json({ error: 'You do not have permission to submit this event' });
    return;
  }
  if (!['draft', 'rejected'].includes(event.status)) {
    res.status(400).json({ error: 'Only draft or rejected events can be submitted for review' });
    return;
  }

  const updated = EventModel.update(id, { status: 'submitted', rejection_notes: null });
  logAction({ actorId: user.id, action: 'submit_event', entityType: 'event', entityId: id });

  await notifyRole('admin', {
    eventType: 'event_submitted',
    title: 'New Event Pending Approval',
    body: `Event "${event.title}" has been submitted for review.`,
    type: 'info',
  });

  res.json(updated);
}

export async function approveEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);

  const event = EventModel.findById(id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'submitted') {
    res.status(400).json({ error: 'Only submitted events can be approved' });
    return;
  }

  const updated = EventModel.update(id, { status: 'published', rejection_notes: null });
  logAction({ actorId: req.user!.id, action: 'approve_event', entityType: 'event', entityId: id });

  const club = ClubModel.findById(event.club_id);
  if (club?.leader_id) {
    await notify({
      userId: club.leader_id,
      eventType: 'event_approved',
      title: 'Event Approved',
      body: `Your event "${event.title}" has been approved and is now published.`,
      type: 'success',
    });
  }

  res.json(updated);
}

export async function rejectEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const { notes } = req.body;

  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    res.status(400).json({ error: 'Rejection notes are required' });
    return;
  }

  const event = EventModel.findById(id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'submitted') {
    res.status(400).json({ error: 'Only submitted events can be rejected' });
    return;
  }

  const updated = EventModel.update(id, { status: 'rejected', rejection_notes: notes.trim() });
  logAction({ actorId: req.user!.id, action: 'reject_event', entityType: 'event', entityId: id });

  const club = ClubModel.findById(event.club_id);
  if (club?.leader_id) {
    await notify({
      userId: club.leader_id,
      eventType: 'event_rejected',
      title: 'Event Rejected',
      body: `Your event "${event.title}" was rejected. Notes: ${notes.trim()}`,
      type: 'error',
    });
  }

  res.json(updated);
}

export async function registerForEvent(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.id);
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'Event is not open for registration' });
    return;
  }
  const existing = RegistrationModel.findByEventAndUser(eventId, req.user!.id);
  if (existing && existing.status !== 'cancelled') {
    res.status(409).json({ error: 'Already registered' });
    return;
  }
  if (event.capacity) {
    const count = RegistrationModel.countByEvent(eventId);
    if (count >= event.capacity) {
      res.status(400).json({ error: 'Event is at full capacity' });
      return;
    }
  }
  const registration = RegistrationModel.create({ event_id: eventId, user_id: req.user!.id });

  await notify({
    userId: req.user!.id,
    eventType: 'registration_confirmed',
    title: 'Registration Confirmed',
    body: `You are registered for "${event.title}" on ${event.starts_at}.`,
    type: 'success',
  });

  res.status(201).json(registration);
}

export function cancelRegistration(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.id);
  const reg = RegistrationModel.findByEventAndUser(eventId, req.user!.id);
  if (!reg) {
    res.status(404).json({ error: 'Registration not found' });
    return;
  }
  RegistrationModel.updateStatus(reg.id, 'cancelled');
  res.json({ message: 'Registration cancelled' });
}
