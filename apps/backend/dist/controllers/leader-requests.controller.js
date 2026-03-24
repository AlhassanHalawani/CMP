"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLeaderRequest = createLeaderRequest;
exports.listLeaderRequests = listLeaderRequests;
exports.listMyLeaderRequests = listMyLeaderRequests;
exports.approveLeaderRequest = approveLeaderRequest;
exports.rejectLeaderRequest = rejectLeaderRequest;
const leader_request_model_1 = require("../models/leader-request.model");
const club_model_1 = require("../models/club.model");
const user_model_1 = require("../models/user.model");
const database_1 = require("../config/database");
const audit_service_1 = require("../services/audit.service");
const notifications_service_1 = require("../services/notifications.service");
/** POST /api/leader-requests — student submits a request */
async function createLeaderRequest(req, res) {
    const user = req.user;
    const clubId = req.body.club_id;
    const message = req.body.message;
    if (!clubId) {
        res.status(400).json({ error: 'club_id is required' });
        return;
    }
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    // Only students may request — existing leaders and admins don't need to
    if (user.role !== 'student') {
        res.status(400).json({ error: 'Only students can submit a club leader request' });
        return;
    }
    // Prevent duplicate pending request
    const existing = leader_request_model_1.LeaderRequestModel.findPendingByUserAndClub(user.id, clubId);
    if (existing) {
        res.status(409).json({ error: 'You already have a pending request for this club' });
        return;
    }
    const request = leader_request_model_1.LeaderRequestModel.create({ user_id: user.id, club_id: clubId, message });
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'create_leader_request', entityType: 'leader_request', entityId: request.id });
    // Notify admins
    const admins = database_1.db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    for (const admin of admins) {
        await (0, notifications_service_1.notify)({
            userId: admin.id,
            eventType: 'leader_request_submitted',
            title: 'New Club Leader Request',
            body: `${user.name} has requested to become the leader of "${club.name}".`,
            type: 'info',
        });
    }
    res.status(201).json(request);
}
/** GET /api/leader-requests — admin lists all requests */
function listLeaderRequests(req, res) {
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const requests = leader_request_model_1.LeaderRequestModel.listAll({ status, limit, offset });
    res.json({ data: requests });
}
/** GET /api/leader-requests/mine — current user's own requests */
function listMyLeaderRequests(req, res) {
    const requests = leader_request_model_1.LeaderRequestModel.listByUser(req.user.id);
    res.json({ data: requests });
}
/** PATCH /api/leader-requests/:id/approve — admin approves */
async function approveLeaderRequest(req, res) {
    const id = parseInt(req.params.id);
    const admin = req.user;
    const request = leader_request_model_1.LeaderRequestModel.findById(id);
    if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
    }
    if (request.status !== 'pending') {
        res.status(400).json({ error: 'Only pending requests can be approved' });
        return;
    }
    const club = club_model_1.ClubModel.findById(request.club_id);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const previousLeaderId = club.leader_id;
    database_1.db.transaction(() => {
        // Mark request as approved
        leader_request_model_1.LeaderRequestModel.updateStatus(id, 'approved', admin.id, req.body.admin_notes);
        // Assign club leader
        club_model_1.ClubModel.update(request.club_id, { leader_id: request.user_id });
        // Promote new leader
        user_model_1.UserModel.updateRole(request.user_id, 'club_leader');
        // Demote previous leader if they no longer lead any other club
        if (previousLeaderId && previousLeaderId !== request.user_id) {
            const stillLeads = database_1.db.prepare('SELECT COUNT(*) as cnt FROM clubs WHERE leader_id = ? AND id != ?').get(previousLeaderId, request.club_id).cnt;
            if (stillLeads === 0) {
                user_model_1.UserModel.updateRole(previousLeaderId, 'student');
            }
        }
    })();
    (0, audit_service_1.logAction)({ actorId: admin.id, action: 'approve_leader_request', entityType: 'leader_request', entityId: id });
    await (0, notifications_service_1.notify)({
        userId: request.user_id,
        eventType: 'leader_request_approved',
        title: 'Club Leader Request Approved',
        body: `Your request to lead "${club.name}" has been approved. You are now the club leader!`,
        type: 'success',
    });
    res.json(leader_request_model_1.LeaderRequestModel.findById(id));
}
/** PATCH /api/leader-requests/:id/reject — admin rejects */
async function rejectLeaderRequest(req, res) {
    const id = parseInt(req.params.id);
    const admin = req.user;
    const request = leader_request_model_1.LeaderRequestModel.findById(id);
    if (!request) {
        res.status(404).json({ error: 'Request not found' });
        return;
    }
    if (request.status !== 'pending') {
        res.status(400).json({ error: 'Only pending requests can be rejected' });
        return;
    }
    const club = club_model_1.ClubModel.findById(request.club_id);
    const updated = leader_request_model_1.LeaderRequestModel.updateStatus(id, 'rejected', admin.id, req.body.admin_notes);
    (0, audit_service_1.logAction)({ actorId: admin.id, action: 'reject_leader_request', entityType: 'leader_request', entityId: id });
    await (0, notifications_service_1.notify)({
        userId: request.user_id,
        eventType: 'leader_request_rejected',
        title: 'Club Leader Request Rejected',
        body: `Your request to lead "${club?.name ?? 'a club'}" was not approved.${req.body.admin_notes ? ` Notes: ${req.body.admin_notes}` : ''}`,
        type: 'error',
    });
    res.json(updated);
}
//# sourceMappingURL=leader-requests.controller.js.map