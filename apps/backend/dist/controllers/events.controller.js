"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.registerForEvent = registerForEvent;
exports.cancelRegistration = cancelRegistration;
const event_model_1 = require("../models/event.model");
const registration_model_1 = require("../models/registration.model");
const audit_service_1 = require("../services/audit.service");
function listEvents(req, res) {
    const status = req.query.status;
    const clubId = req.query.club_id ? parseInt(req.query.club_id) : undefined;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const events = event_model_1.EventModel.list({ status, clubId, limit, offset });
    const total = event_model_1.EventModel.count({ status, clubId });
    res.json({ data: events, total });
}
function getEvent(req, res) {
    const event = event_model_1.EventModel.findById(parseInt(req.params.id));
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    res.json(event);
}
function createEvent(req, res) {
    const data = { ...req.body, created_by: req.user.id };
    const event = event_model_1.EventModel.create(data);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'create', entityType: 'event', entityId: event.id });
    res.status(201).json(event);
}
function updateEvent(req, res) {
    const id = parseInt(req.params.id);
    const existing = event_model_1.EventModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    const event = event_model_1.EventModel.update(id, req.body);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'update', entityType: 'event', entityId: id });
    res.json(event);
}
function deleteEvent(req, res) {
    const id = parseInt(req.params.id);
    const deleted = event_model_1.EventModel.delete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'delete', entityType: 'event', entityId: id });
    res.status(204).send();
}
function registerForEvent(req, res) {
    const eventId = parseInt(req.params.id);
    const event = event_model_1.EventModel.findById(eventId);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status !== 'published') {
        res.status(400).json({ error: 'Event is not open for registration' });
        return;
    }
    const existing = registration_model_1.RegistrationModel.findByEventAndUser(eventId, req.user.id);
    if (existing && existing.status !== 'cancelled') {
        res.status(409).json({ error: 'Already registered' });
        return;
    }
    if (event.capacity) {
        const count = registration_model_1.RegistrationModel.countByEvent(eventId);
        if (count >= event.capacity) {
            res.status(400).json({ error: 'Event is at full capacity' });
            return;
        }
    }
    const registration = registration_model_1.RegistrationModel.create({ event_id: eventId, user_id: req.user.id });
    res.status(201).json(registration);
}
function cancelRegistration(req, res) {
    const eventId = parseInt(req.params.id);
    const reg = registration_model_1.RegistrationModel.findByEventAndUser(eventId, req.user.id);
    if (!reg) {
        res.status(404).json({ error: 'Registration not found' });
        return;
    }
    registration_model_1.RegistrationModel.updateStatus(reg.id, 'cancelled');
    res.json({ message: 'Registration cancelled' });
}
//# sourceMappingURL=events.controller.js.map