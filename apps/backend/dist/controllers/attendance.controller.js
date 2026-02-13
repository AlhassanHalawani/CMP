"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEventQr = generateEventQr;
exports.checkIn = checkIn;
exports.manualCheckIn = manualCheckIn;
exports.getAttendanceList = getAttendanceList;
const attendance_model_1 = require("../models/attendance.model");
const event_model_1 = require("../models/event.model");
const qrcode_service_1 = require("../services/qrcode.service");
async function generateEventQr(req, res) {
    const eventId = parseInt(req.params.eventId);
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    const token = attendance_model_1.AttendanceModel.generateQrToken(eventId);
    const qrDataUrl = await (0, qrcode_service_1.generateQr)(token);
    res.json({ token, qr: qrDataUrl });
}
function checkIn(req, res) {
    const { token } = req.body;
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
    const list = attendance_model_1.AttendanceModel.findByEvent(eventId);
    const count = attendance_model_1.AttendanceModel.countByEvent(eventId);
    res.json({ data: list, total: count });
}
//# sourceMappingURL=attendance.controller.js.map