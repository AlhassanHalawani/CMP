"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEvents = listEvents;
exports.listEventCategories = listEventCategories;
exports.exportEventIcs = exportEventIcs;
exports.exportCalendarIcs = exportCalendarIcs;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.submitEvent = submitEvent;
exports.approveEvent = approveEvent;
exports.rejectEvent = rejectEvent;
exports.registerForEvent = registerForEvent;
exports.cancelRegistration = cancelRegistration;
const event_model_1 = require("../models/event.model");
const registration_model_1 = require("../models/registration.model");
const club_model_1 = require("../models/club.model");
const membership_model_1 = require("../models/membership.model");
const audit_service_1 = require("../services/audit.service");
const ownership_service_1 = require("../services/ownership.service");
const notifications_service_1 = require("../services/notifications.service");
function listEvents(req, res) {
    const authReq = req;
    const user = authReq.user;
    let status = req.query.status;
    const clubId = req.query.club_id ? parseInt(req.query.club_id) : undefined;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category;
    const location = req.query.location;
    const startsAfter = req.query.starts_after;
    const endsBefore = req.query.ends_before;
    const baseFilters = { clubId, limit, offset, category, location, startsAfter, endsBefore };
    if (!user || user.role === 'student') {
        // Anonymous and students only see published events
        const events = event_model_1.EventModel.list({ ...baseFilters, status: 'published' });
        const total = event_model_1.EventModel.count({ ...baseFilters, status: 'published' });
        res.json({ data: events, total });
    }
    else if ((0, ownership_service_1.isAdmin)(user)) {
        // Admins see all events; respect an explicit status filter if provided
        const events = event_model_1.EventModel.list({ ...baseFilters, status });
        const total = event_model_1.EventModel.count({ ...baseFilters, status });
        res.json({ data: events, total });
    }
    else {
        // Club leaders: published events + all events belonging to clubs they lead
        const leaderClubIds = (0, ownership_service_1.getLeaderClubIds)(user.id);
        const events = event_model_1.EventModel.list({ ...baseFilters, leaderClubIds });
        const total = event_model_1.EventModel.count({ ...baseFilters, leaderClubIds });
        res.json({ data: events, total });
    }
}
function listEventCategories(_req, res) {
    const categories = event_model_1.EventModel.listDistinctCategories();
    res.json(categories);
}
function toIcsDate(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function buildIcsEvent(event) {
    if (!event)
        return '';
    const uid = `event-${event.id}@fcit-cmp`;
    const summary = event.title.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const description = (event.description ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const location = (event.location ?? '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
        `DTSTART:${toIcsDate(event.starts_at)}`,
        `DTEND:${toIcsDate(event.ends_at)}`,
        `SUMMARY:${summary}`,
        description ? `DESCRIPTION:${description}` : '',
        location ? `LOCATION:${location}` : '',
        'END:VEVENT',
    ]
        .filter(Boolean)
        .join('\r\n');
}
function exportEventIcs(req, res) {
    const event = event_model_1.EventModel.findById(parseInt(req.params.id));
    if (!event || event.status !== 'published') {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FCIT CMP//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        buildIcsEvent(event),
        'END:VCALENDAR',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.ics"`);
    res.send(ics);
}
function exportCalendarIcs(req, res) {
    const clubId = req.query.club_id ? parseInt(req.query.club_id) : undefined;
    const category = req.query.category;
    const events = event_model_1.EventModel.list({ status: 'published', clubId, category, limit: 500 });
    const vevents = events.map(buildIcsEvent).join('\r\n');
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FCIT CMP//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        vevents,
        'END:VCALENDAR',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fcit-cmp-events.ics"');
    res.send(ics);
}
function getEvent(req, res) {
    const user = req.user;
    const event = event_model_1.EventModel.findById(parseInt(req.params.id));
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status === 'published') {
        res.json(event);
        return;
    }
    // Unpublished: only admins and the owning leader may view
    if (!user) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if ((0, ownership_service_1.isAdmin)(user) || (0, ownership_service_1.leaderOwnsEvent)(user.id, event.id)) {
        res.json(event);
        return;
    }
    res.status(404).json({ error: 'Event not found' });
}
function createEvent(req, res) {
    const user = req.user;
    const clubId = req.body.club_id;
    // club_leader can only create events in clubs they own
    if (!(0, ownership_service_1.isAdmin)(user)) {
        if (!clubId || !(0, ownership_service_1.leaderOwnsClub)(user.id, clubId)) {
            res.status(403).json({ error: 'You can only create events in clubs you lead' });
            return;
        }
        // Leaders always start in draft — strip any status from body
        req.body.status = 'draft';
    }
    const data = { ...req.body, created_by: user.id };
    const event = event_model_1.EventModel.create(data);
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'create', entityType: 'event', entityId: event.id });
    res.status(201).json(event);
}
function updateEvent(req, res) {
    const id = parseInt(req.params.id);
    const user = req.user;
    const existing = event_model_1.EventModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    // club_leader may only update events in clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user)) {
        if (!(0, ownership_service_1.leaderOwnsEvent)(user.id, id)) {
            res.status(403).json({ error: 'You do not have permission to update this event' });
            return;
        }
        // If moving to a different club, leader must also own the target club
        if (req.body.club_id !== undefined && req.body.club_id !== existing.club_id) {
            if (!(0, ownership_service_1.leaderOwnsClub)(user.id, req.body.club_id)) {
                res.status(403).json({ error: 'You do not have permission to move this event to the target club' });
                return;
            }
        }
        // Leaders cannot change status through PATCH — use /submit endpoint
        delete req.body.status;
        delete req.body.rejection_notes;
    }
    const event = event_model_1.EventModel.update(id, req.body);
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'update', entityType: 'event', entityId: id });
    res.json(event);
}
function deleteEvent(req, res) {
    const id = parseInt(req.params.id);
    const user = req.user;
    const existing = event_model_1.EventModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    // club_leader may only delete events in clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsEvent)(user.id, id)) {
        res.status(403).json({ error: 'You do not have permission to delete this event' });
        return;
    }
    event_model_1.EventModel.delete(id);
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'delete', entityType: 'event', entityId: id });
    res.status(204).send();
}
async function submitEvent(req, res) {
    const id = parseInt(req.params.id);
    const user = req.user;
    const event = event_model_1.EventModel.findById(id);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (!(0, ownership_service_1.leaderOwnsEvent)(user.id, id)) {
        res.status(403).json({ error: 'You do not have permission to submit this event' });
        return;
    }
    if (!['draft', 'rejected'].includes(event.status)) {
        res.status(400).json({ error: 'Only draft or rejected events can be submitted for review' });
        return;
    }
    const updated = event_model_1.EventModel.update(id, { status: 'submitted', rejection_notes: null });
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'submit_event', entityType: 'event', entityId: id });
    await (0, notifications_service_1.notifyRole)('admin', {
        eventType: 'event_submitted',
        title: 'New Event Pending Approval',
        body: `Event "${event.title}" has been submitted for review.`,
        type: 'info',
    });
    res.json(updated);
}
async function approveEvent(req, res) {
    const id = parseInt(req.params.id);
    const event = event_model_1.EventModel.findById(id);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status !== 'submitted') {
        res.status(400).json({ error: 'Only submitted events can be approved' });
        return;
    }
    const updated = event_model_1.EventModel.update(id, { status: 'published', rejection_notes: null });
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'approve_event', entityType: 'event', entityId: id });
    const club = club_model_1.ClubModel.findById(event.club_id);
    if (club?.leader_id) {
        await (0, notifications_service_1.notify)({
            userId: club.leader_id,
            eventType: 'event_approved',
            title: 'Event Approved',
            body: `Your event "${event.title}" has been approved and is now published.`,
            type: 'success',
        });
    }
    res.json(updated);
}
async function rejectEvent(req, res) {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    if (!notes || typeof notes !== 'string' || !notes.trim()) {
        res.status(400).json({ error: 'Rejection notes are required' });
        return;
    }
    const event = event_model_1.EventModel.findById(id);
    if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    if (event.status !== 'submitted') {
        res.status(400).json({ error: 'Only submitted events can be rejected' });
        return;
    }
    const updated = event_model_1.EventModel.update(id, { status: 'rejected', rejection_notes: notes.trim() });
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'reject_event', entityType: 'event', entityId: id });
    const club = club_model_1.ClubModel.findById(event.club_id);
    if (club?.leader_id) {
        await (0, notifications_service_1.notify)({
            userId: club.leader_id,
            eventType: 'event_rejected',
            title: 'Event Rejected',
            body: `Your event "${event.title}" was rejected. Notes: ${notes.trim()}`,
            type: 'error',
        });
    }
    res.json(updated);
}
async function registerForEvent(req, res) {
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
    if (event.members_only) {
        const membership = membership_model_1.MembershipModel.findByClubAndUser(event.club_id, req.user.id);
        if (!membership || membership.status !== 'active') {
            res.status(403).json({ error: 'This event is open to club members only.' });
            return;
        }
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
    await (0, notifications_service_1.notify)({
        userId: req.user.id,
        eventType: 'registration_confirmed',
        title: 'Registration Confirmed',
        body: `You are registered for "${event.title}" on ${event.starts_at}.`,
        type: 'success',
    });
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