import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { EventModel } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { logAction } from '../services/audit.service';

export function listEvents(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
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
  const data = { ...req.body, created_by: req.user!.id };
  const event = EventModel.create(data);
  logAction({ actorId: req.user!.id, action: 'create', entityType: 'event', entityId: event.id });
  res.status(201).json(event);
}

export function updateEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const existing = EventModel.findById(id);
  if (!existing) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const event = EventModel.update(id, req.body);
  logAction({ actorId: req.user!.id, action: 'update', entityType: 'event', entityId: id });
  res.json(event);
}

export function deleteEvent(req: AuthRequest, res: Response) {
  const id = parseInt(req.params.id);
  const deleted = EventModel.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  logAction({ actorId: req.user!.id, action: 'delete', entityType: 'event', entityId: id });
  res.status(204).send();
}

export function registerForEvent(req: AuthRequest, res: Response) {
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
