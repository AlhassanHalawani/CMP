"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventQr = generateEventQr;
exports.checkIn = checkIn;
exports.manualCheckIn = manualCheckIn;
exports.getAttendanceList = getAttendanceList;
exports.getEventRegistrations = getEventRegistrations;
exports.openCheckin = openCheckin;
exports.closeCheckin = closeCheckin;
exports.finalizeCheckin = finalizeCheckin;
const attendance_model_1 = require("../models/attendance.model");
const event_model_1 = require("../models/event.model");
const registration_model_1 = require("../models/registration.model");
const qrcode_service_1 = require("../services/qrcode.service");
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
function getAttendanceList(req, res) {
    const eventId = parseInt(req.params.eventId);
    const user = req.user;
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
    const list = attendance_model_1.AttendanceModel.findByEvent(eventId);
    const count = attendance_model_1.AttendanceModel.countByEvent(eventId);
    res.json({ data: list, total: count });
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