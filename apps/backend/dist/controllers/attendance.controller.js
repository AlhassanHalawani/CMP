"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventQr = generateEventQr;
exports.checkIn = checkIn;
exports.manualCheckIn = manualCheckIn;
exports.getAttendanceList = getAttendanceList;
exports.getEventRegistrations = getEventRegistrations;
const attendance_model_1 = require("../models/attendance.model");
const event_model_1 = require("../models/event.model");
const registration_model_1 = require("../models/registration.model");
const qrcode_service_1 = require("../services/qrcode.service");
async function generateEventQr(req, res) {
    const eventId = parseInt(req.params.eventId);
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status !== 'published') {
        res.status(400).json({ error: 'QR generation is only available for published events' });
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
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    const list = attendance_model_1.AttendanceModel.findByEvent(eventId);
    const count = attendance_model_1.AttendanceModel.countByEvent(eventId);
    res.json({ data: list, total: count });
}
function getEventRegistrations(req, res) {
    const eventId = parseInt(req.params.eventId);
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    const registrations = registration_model_1.RegistrationModel.findByEvent(eventId);
    res.json({ data: registrations, total: registrations.length });
}
//# sourceMappingURL=attendance.controller.js.map