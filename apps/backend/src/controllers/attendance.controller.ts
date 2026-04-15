import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AttendanceModel } from '../models/attendance.model';
import { EventModel } from '../models/event.model';
import { ClubModel } from '../models/club.model';
import { RegistrationModel } from '../models/registration.model';
import { generateQr } from '../services/qrcode.service';
import { generateAttendanceReport } from '../services/pdf.service';
import { isAdmin, leaderOwnsEvent } from '../services/ownership.service';
import { logAction } from '../services/audit.service';
import { evaluateStudentAchievements } from '../services/achievement-engine.service';

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

  // Best-effort: evaluate student achievements after check-in
  try { evaluateStudentAchievements(req.user!.id); } catch { /* ignore */ }

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

  // Best-effort: evaluate student achievements after manual check-in
  try { evaluateStudentAchievements(user_id); } catch { /* ignore */ }

  res.status(201).json(attendance);
}

export async function getAttendanceList(req: AuthRequest, res: Response) {
  const eventId = parseInt(req.params.eventId);
  const user = req.user!;
  const format = (req.query.format as string) || 'json';
  const status = (req.query.status as string) || 'all';

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

  const present = AttendanceModel.findPresentWithUsers(eventId);
  const noShows = AttendanceModel.findNoShowsWithUsers(eventId);
  const totalRegistered = present.length + noShows.length;
  const attendanceRate = totalRegistered > 0 ? Math.round((present.length / totalRegistered) * 100) : 0;

  if (format === 'csv') {
    const rows = [['Name', 'Email', 'Status', 'Time', 'Method']];
    if (status !== 'no_show') {
      present.forEach((r) => rows.push([r.name, r.email, 'Present', r.checked_in_at, r.method]));
    }
    if (status !== 'present') {
      noShows.forEach((r) => rows.push([r.name, r.email, 'No-show', r.registered_at, '—']));
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-event-${eventId}.csv`);
    return res.send(csv);
  }

  if (format === 'pdf') {
    const club = ClubModel.findById(event.club_id);
    const pdf = await generateAttendanceReport(event, club?.name ?? '', present, noShows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-event-${eventId}.pdf`);
    return res.send(pdf);
  }

  // JSON (default)
  const data =
    status === 'present'
      ? present
      : status === 'no_show'
      ? noShows
      : [...present.map((r) => ({ ...r, attendance_status: 'present' })), ...noShows.map((r) => ({ ...r, attendance_status: 'no_show' }))];

  res.json({
    data,
    summary: { total_registered: totalRegistered, present: present.length, no_show: noShows.length, attendance_rate: attendanceRate },
  });
}

export async function getClubAttendanceReport(req: AuthRequest, res: Response) {
  const user = req.user!;
  const clubId = parseInt(req.query.club_id as string);
  const startsAfter = req.query.starts_after as string;
  const endsBefore = req.query.ends_before as string;
  const format = (req.query.format as string) || 'json';

  if (!clubId || !startsAfter || !endsBefore) {
    res.status(400).json({ error: 'club_id, starts_after, and ends_before are required' });
    return;
  }

  const club = ClubModel.findById(clubId);
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  // club_leader scoped to own club
  if (!isAdmin(user) && club.leader_id !== user.id) {
    res.status(403).json({ error: 'You do not have permission to access this club\'s data' });
    return;
  }

  const rows = AttendanceModel.findClubReport(clubId, startsAfter, endsBefore);

  if (format === 'csv') {
    const csvRows = [['Event', 'Event Date', 'Name', 'Email', 'Status', 'Check-in Time', 'Method']];
    rows.forEach((r) =>
      csvRows.push([
        r.event_title,
        r.event_starts_at.slice(0, 10),
        r.name,
        r.email,
        r.status,
        r.checked_in_at ?? '',
        r.method ?? '',
      ])
    );
    const csv = csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-club-${clubId}.csv`);
    return res.send(csv);
  }

  if (format === 'pdf') {
    const present = rows.filter((r) => r.status === 'Present').map((r) => ({
      name: r.name, email: r.email, checked_in_at: r.checked_in_at ?? '', method: r.method ?? 'manual' as 'qr' | 'manual',
    }));
    const noShows = rows.filter((r) => r.status === 'No-show').map((r) => ({
      name: r.name, email: r.email, registered_at: '',
    }));
    const fakeEvent = { title: `${club.name} — ${startsAfter} to ${endsBefore}`, starts_at: startsAfter } as any;
    const pdf = await generateAttendanceReport(fakeEvent, club.name, present, noShows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-club-${clubId}.pdf`);
    return res.send(pdf);
  }

  res.json({ data: rows, total: rows.length });
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
