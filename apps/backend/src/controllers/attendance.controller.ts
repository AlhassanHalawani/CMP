import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AttendanceModel } from '../models/attendance.model';
import { EventModel } from '../models/event.model';
import { RegistrationModel } from '../models/registration.model';
import { generateQr } from '../services/qrcode.service';

export async function generateEventQr(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  if (event.status !== 'published') {
    res.status(400).json({ error: 'QR generation is only available for published events' });
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
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const list = AttendanceModel.findByEvent(eventId);
  const count = AttendanceModel.countByEvent(eventId);
  res.json({ data: list, total: count });
}

export function getEventRegistrations(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const registrations = RegistrationModel.findByEvent(eventId);
  res.json({ data: registrations, total: registrations.length });
}
