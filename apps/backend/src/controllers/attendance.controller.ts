import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AttendanceModel } from '../models/attendance.model';
import { EventModel } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { generateQr } from '../services/qrcode.service';
import { isAdmin, leaderOwnsEvent } from '../services/ownership.service';
import { logAction } from '../services/audit.service';

export async function generateEventQr(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'QR generation is only available for published events' });
    return;
  }

  // club_leader may only generate QR for events in clubs they lead
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
    return;
  }

  const token = AttendanceModel.generateQrToken(eventId);
  const qrDataUrl = await generateQr(token);
  res.json({ token, qr: qrDataUrl });
}

export function checkIn(req: AuthRequest, res: Response) {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Token is required' });
    return;
  }
  const parsed = AttendanceModel.verifyQrToken(token);
  if (!parsed) {
    res.status(400).json({ error: 'Invalid QR token' });
    return;
  }
  const event = EventModel.findById(parsed.eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'Check-in is only available for published events' });
    return;
  }
  if (!event.checkin_open) {
    res.status(400).json({ error: 'Check-in window is not open for this event' });
    return;
  }
  if (event.checkin_finalized) {
    res.status(400).json({ error: 'Attendance for this event has been finalized' });
    return;
  }
  // Enforce registration requirement
  const registration = RegistrationModel.findByEventAndUser(parsed.eventId, req.user!.id);
  if (!registration || registration.status === 'cancelled') {
    res.status(403).json({ error: 'You must be registered for this event to check in' });
    return;
  }
  const existing = AttendanceModel.findByEventAndUser(parsed.eventId, req.user!.id);
  if (existing) {
    res.status(409).json({ error: 'Already checked in' });
    return;
  }
  // Capacity re-validation at check-in time
  if (event.capacity) {
    const attended = AttendanceModel.countByEvent(parsed.eventId);
    if (attended >= event.capacity) {
      res.status(400).json({ error: 'Event has reached capacity' });
      return;
    }
  }
  const attendance = AttendanceModel.checkIn({
    event_id: parsed.eventId,
    user_id: req.user!.id,
    method: 'qr',
    qr_token: token,
  });
  res.status(201).json(attendance);
}

export function manualCheckIn(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const { user_id } = req.body;
  const user = req.user!;

  if (!user_id || typeof user_id !== 'number') {
    res.status(400).json({ error: 'Valid user_id is required' });
    return;
  }
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'Check-in is only available for published events' });
    return;
  }
  if (!event.checkin_open) {
    res.status(400).json({ error: 'Check-in window is not open for this event' });
    return;
  }
  if (event.checkin_finalized) {
    res.status(400).json({ error: 'Attendance for this event has been finalized' });
    return;
  }

  // club_leader may only manually check in for events in clubs they lead
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
    return;
  }

  const existing = AttendanceModel.findByEventAndUser(eventId, user_id);
  if (existing) {
    res.status(409).json({ error: 'Already checked in' });
    return;
  }
  const attendance = AttendanceModel.checkIn({ event_id: eventId, user_id, method: 'manual' });
  res.status(201).json(attendance);
}

export function getAttendanceList(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // club_leader may only view attendance for events in clubs they lead
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to view attendance for this event' });
    return;
  }

  const list = AttendanceModel.findByEvent(eventId);
  const count = AttendanceModel.countByEvent(eventId);
  res.json({ data: list, total: count });
}

export function getEventRegistrations(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // club_leader may only view registrations for events in clubs they lead
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to view registrations for this event' });
    return;
  }

  const registrations = RegistrationModel.findByEvent(eventId);
  res.json({ data: registrations, total: registrations.length });
}

export function openCheckin(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'Check-in can only be opened for published events' });
    return;
  }
  if (event.checkin_finalized) {
    res.status(400).json({ error: 'Attendance for this event has been finalized' });
    return;
  }

  const updated = EventModel.update(eventId, { checkin_open: 1 });
  res.json(updated);
}

export function closeCheckin(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
    return;
  }

  const updated = EventModel.update(eventId, { checkin_open: 0 });
  res.json(updated);
}

export function finalizeCheckin(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;

  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (!isAdmin(user) && !leaderOwnsEvent(user.id, eventId)) {
    res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
    return;
  }

  const updated = EventModel.update(eventId, { checkin_open: 0, checkin_finalized: 1 });
  logAction({
    actorId: user.id,
    action: 'finalize_attendance',
    entityType: 'event',
    entityId: eventId,
  });
  res.json(updated);
}
