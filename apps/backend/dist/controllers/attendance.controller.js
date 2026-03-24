"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventQr = generateEventQr;
exports.checkIn = checkIn;
exports.manualCheckIn = manualCheckIn;
exports.getAttendanceList = getAttendanceList;
exports.getClubAttendanceReport = getClubAttendanceReport;
exports.getEventRegistrations = getEventRegistrations;
exports.openCheckin = openCheckin;
exports.closeCheckin = closeCheckin;
exports.finalizeCheckin = finalizeCheckin;
const attendance_model_1 = require("../models/attendance.model");
const event_model_1 = require("../models/event.model");
const club_model_1 = require("../models/club.model");
const registration_model_1 = require("../models/registration.model");
const qrcode_service_1 = require("../services/qrcode.service");
const pdf_service_1 = require("../services/pdf.service");
const ownership_service_1 = require("../services/ownership.service");
const audit_service_1 = require("../services/audit.service");
async function generateEventQr(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status !== 'published') {
        res.status(400).json({ error: 'QR generation is only available for published events' });
        return;
    }
    // club_leader may only generate QR for events in clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
        return;
    }
    const token = attendance_model_1.AttendanceModel.generateQrToken(eventId);
    const qrDataUrl = await (0, qrcode_service_1.generateQr)(token);
    res.json({ token, qr: qrDataUrl });
}
function checkIn(req, res) {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token is required' });
        return;
    }
    const parsed = attendance_model_1.AttendanceModel.verifyQrToken(token);
    if (!parsed) {
        res.status(400).json({ error: 'Invalid QR token' });
        return;
    }
    const event = event_model_1.EventModel.findById(parsed.eventId);
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
    const registration = registration_model_1.RegistrationModel.findByEventAndUser(parsed.eventId, req.user.id);
    if (!registration || registration.status === 'cancelled') {
        res.status(403).json({ error: 'You must be registered for this event to check in' });
        return;
    }
    const existing = attendance_model_1.AttendanceModel.findByEventAndUser(parsed.eventId, req.user.id);
    if (existing) {
        res.status(409).json({ error: 'Already checked in' });
        return;
    }
    // Capacity re-validation at check-in time
    if (event.capacity) {
        const attended = attendance_model_1.AttendanceModel.countByEvent(parsed.eventId);
        if (attended >= event.capacity) {
            res.status(400).json({ error: 'Event has reached capacity' });
            return;
        }
    }
    const attendance = attendance_model_1.AttendanceModel.checkIn({
        event_id: parsed.eventId,
        user_id: req.user.id,
        method: 'qr',
        qr_token: token,
    });
    res.status(201).json(attendance);
}
function manualCheckIn(req, res) {
    const eventId = parseInt(req.params.eventId);
    const { user_id } = req.body;
    const user = req.user;
    if (!user_id || typeof user_id !== 'number') {
        res.status(400).json({ error: 'Valid user_id is required' });
        return;
    }
    const event = event_model_1.EventModel.findById(eventId);
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
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
        return;
    }
    const existing = attendance_model_1.AttendanceModel.findByEventAndUser(eventId, user_id);
    if (existing) {
        res.status(409).json({ error: 'Already checked in' });
        return;
    }
    const attendance = attendance_model_1.AttendanceModel.checkIn({ event_id: eventId, user_id, method: 'manual' });
    res.status(201).json(attendance);
}
async function getAttendanceList(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const format = req.query.format || 'json';
    const status = req.query.status || 'all';
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    // club_leader may only view attendance for events in clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to view attendance for this event' });
        return;
    }
    const present = attendance_model_1.AttendanceModel.findPresentWithUsers(eventId);
    const noShows = attendance_model_1.AttendanceModel.findNoShowsWithUsers(eventId);
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
        const club = club_model_1.ClubModel.findById(event.club_id);
        const pdf = await (0, pdf_service_1.generateAttendanceReport)(event, club?.name ?? '', present, noShows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-event-${eventId}.pdf`);
        return res.send(pdf);
    }
    // JSON (default)
    const data = status === 'present'
        ? present
        : status === 'no_show'
            ? noShows
            : [...present.map((r) => ({ ...r, attendance_status: 'present' })), ...noShows.map((r) => ({ ...r, attendance_status: 'no_show' }))];
    res.json({
        data,
        summary: { total_registered: totalRegistered, present: present.length, no_show: noShows.length, attendance_rate: attendanceRate },
    });
}
async function getClubAttendanceReport(req, res) {
    const user = req.user;
    const clubId = parseInt(req.query.club_id);
    const startsAfter = req.query.starts_after;
    const endsBefore = req.query.ends_before;
    const format = req.query.format || 'json';
    if (!clubId || !startsAfter || !endsBefore) {
        res.status(400).json({ error: 'club_id, starts_after, and ends_before are required' });
        return;
    }
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    // club_leader scoped to own club
    if (!(0, ownership_service_1.isAdmin)(user) && club.leader_id !== user.id) {
        res.status(403).json({ error: 'You do not have permission to access this club\'s data' });
        return;
    }
    const rows = attendance_model_1.AttendanceModel.findClubReport(clubId, startsAfter, endsBefore);
    if (format === 'csv') {
        const csvRows = [['Event', 'Event Date', 'Name', 'Email', 'Status', 'Check-in Time', 'Method']];
        rows.forEach((r) => csvRows.push([
            r.event_title,
            r.event_starts_at.slice(0, 10),
            r.name,
            r.email,
            r.status,
            r.checked_in_at ?? '',
            r.method ?? '',
        ]));
        const csv = csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-club-${clubId}.csv`);
        return res.send(csv);
    }
    if (format === 'pdf') {
        const present = rows.filter((r) => r.status === 'Present').map((r) => ({
            name: r.name, email: r.email, checked_in_at: r.checked_in_at ?? '', method: r.method ?? 'manual',
        }));
        const noShows = rows.filter((r) => r.status === 'No-show').map((r) => ({
            name: r.name, email: r.email, registered_at: '',
        }));
        const fakeEvent = { title: `${club.name} — ${startsAfter} to ${endsBefore}`, starts_at: startsAfter };
        const pdf = await (0, pdf_service_1.generateAttendanceReport)(fakeEvent, club.name, present, noShows);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=attendance-club-${clubId}.pdf`);
        return res.send(pdf);
    }
    res.json({ data: rows, total: rows.length });
}
function getEventRegistrations(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    // club_leader may only view registrations for events in clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to view registrations for this event' });
        return;
    }
    const registrations = registration_model_1.RegistrationModel.findByEvent(eventId);
    res.json({ data: registrations, total: registrations.length });
}
function openCheckin(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
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
    const updated = event_model_1.EventModel.update(eventId, { checkin_open: 1 });
    res.json(updated);
}
function closeCheckin(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
        return;
    }
    const updated = event_model_1.EventModel.update(eventId, { checkin_open: 0 });
    res.json(updated);
}
function finalizeCheckin(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, eventId)) {
        res.status(403).json({ error: 'You do not have permission to manage attendance for this event' });
        return;
    }
    const updated = event_model_1.EventModel.update(eventId, { checkin_open: 0, checkin_finalized: 1 });
    (0, audit_service_1.logAction)({
        actorId: user.id,
        action: 'finalize_attendance',
        entityType: 'event',
        entityId: eventId,
    });
    res.json(updated);
}
//# sourceMappingURL=attendance.controller.js.map