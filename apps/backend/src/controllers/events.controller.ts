import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { EventModel } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { ClubModel } from '../models/club.model';
import { MembershipModel } from '../models/membership.model';
import { logAction } from '../services/audit.service';
import { isAdmin, leaderOwnsClub, leaderOwnsEvent, getLeaderClubIds } from '../services/ownership.service';
import { notify, notifyRole } from '../services/notifications.service';

export function listEvents(req: Request, res: Response) {
  const authReq = req as AuthRequest;
  const user = authReq.user;
  const status = req.query.status as string | undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const category = req.query.category as string | undefined;
  const location = req.query.location as string | undefined;
  const startsAfter = req.query.starts_after as string | undefined;
  const endsBefore = req.query.ends_before as string | undefined;

  const baseFilters = { clubId, limit, offset, category, location, startsAfter, endsBefore };

  if (!user || user.role === 'student') {
    // Anonymous and students only see published events
    const events = EventModel.list({ ...baseFilters, status: 'published' });
    const total = EventModel.count({ ...baseFilters, status: 'published' });
    res.json({ data: events, total });
  } else if (isAdmin(user)) {
    // Admins see all events; respect an explicit status filter if provided
    const events = EventModel.list({ ...baseFilters, status });
    const total = EventModel.count({ ...baseFilters, status });
    res.json({ data: events, total });
  } else {
    // Club leaders: published events + all events belonging to clubs they lead
    const leaderClubIds = getLeaderClubIds(user.id);
    const events = EventModel.list({ ...baseFilters, leaderClubIds });
    const total = EventModel.count({ ...baseFilters, leaderClubIds });
    res.json({ data: events, total });
  }
}

export function listEventCategories(_req: Request, res: Response) {
  const categories = EventModel.listDistinctCategories();
  res.json(categories);
}

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildIcsEvent(event: ReturnType<typeof EventModel.findById>): string {
  if (!event) return '';
  const uid = `event-${event.id}@fcit-cmp`;
  const summary = event.title.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const description = (event.description ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const location = (event.location ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.starts_at)}`,
    `DTEND:${toIcsDate(event.ends_at)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    location ? `LOCATION:${location}` : '',
    'END:VEVENT',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function exportEventIcs(req: Request, res: Response) {
  const event = EventModel.findById(parseInt(req.params.id));
  if (!event || event.status !== 'published') {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FCIT CMP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    buildIcsEvent(event),
    'END:VCALENDAR',
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
  res.send(ics);
}

export function exportCalendarIcs(req: Request, res: Response) {
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const category = req.query.category as string | undefined;
  const events = EventModel.list({ status: 'published', clubId, category, limit: 500 });
  const vevents = events.map(buildIcsEvent).join('\r\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FCIT CMP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fcit-cmp-events.ics"');
  res.send(ics);
}

export function getEvent(req: Request, res: Response) {
  const user = (req as AuthRequest).user;
  const event = EventModel.findById(parseInt(req.params.id));
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  if (event.status === 'published') {
    res.json(event);
    return;
  }

  // Unpublished: only admins and the owning leader may view
  if (!user) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (isAdmin(user) || leaderOwnsEvent(user.id, event.id)) {
    res.json(event);
    return;
  }
  res.status(404).json({ error: 'Event not found' });
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

  // Online events bypass admin approval and publish immediately
  if (event.delivery_mode === 'online') {
    const updated = EventModel.update(id, { status: 'published', rejection_notes: null });
    logAction({ actorId: user.id, action: 'publish_online_event', entityType: 'event', entityId: id });

    await notify({
      userId: user.id,
      eventType: 'event_approved',
      title: 'Event Published',
      body: `Your online event "${event.title}" is now published.`,
      type: 'success',
      targetUrl: `/events/${id}`,
    });

    res.json(updated);
    return;
  }

  // Physical events go through admin approval
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
      targetUrl: `/events/${id}`,
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
      targetUrl: `/events/${id}`,
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
  if (event.members_only) {
    const membership = MembershipModel.findByClubAndUser(event.club_id, req.user!.id);
    if (!membership || membership.status !== 'active') {
      res.status(403).json({ error: 'This event is open to club members only.' });
      return;
    }
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
    targetUrl: `/events/${eventId}`,
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
