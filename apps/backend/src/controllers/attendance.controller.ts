import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AttendanceModel } from '../models/attendance.model';
import { EventModel } from '../models/event.model';
import { generateQr } from '../services/qrcode.service';

export async function generateEventQr(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const event = EventModel.findById(eventId);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  const token = AttendanceModel.generateQrToken(eventId);
  const qrDataUrl = await generateQr(token);
  res.json({ token, qr: qrDataUrl });
}

export function checkIn(req: AuthRequest, res: Response) {
  const { token } = req.body;
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
  const list = AttendanceModel.findByEvent(eventId);
  const count = AttendanceModel.countByEvent(eventId);
  res.json({ data: list, total: count });
}
