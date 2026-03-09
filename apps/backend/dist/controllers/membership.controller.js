"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinClub = joinClub;
exports.leaveClub = leaveClub;
exports.listMembers = listMembers;
exports.updateMembership = updateMembership;
exports.getMembership = getMembership;
const membership_model_1 = require("../models/membership.model");
const club_model_1 = require("../models/club.model");
const ownership_service_1 = require("../services/ownership.service");
const notifications_service_1 = require("../services/notifications.service");
const audit_service_1 = require("../services/audit.service");
async function joinClub(req, res) {
    const clubId = parseInt(req.params.id);
    const userId = req.user.id;
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const existing = membership_model_1.MembershipModel.findByClubAndUser(clubId, userId);
    if (existing) {
        if (existing.status === 'active') {
            res.status(409).json({ error: 'Already a member' });
            return;
        }
        if (existing.status === 'pending') {
            res.status(409).json({ error: 'Membership request already pending' });
            return;
        }
        // inactive → re-request
        const updated = membership_model_1.MembershipModel.updateStatus(existing.id, 'pending');
        if (club.leader_id) {
            await (0, notifications_service_1.notify)({
                userId: club.leader_id,
                eventType: 'membership_requested',
                title: 'New Membership Request',
                body: `${req.user.name} has requested to join "${club.name}".`,
                type: 'info',
            });
        }
        res.status(201).json(updated);
        return;
    }
    const membership = membership_model_1.MembershipModel.create(clubId, userId);
    if (club.leader_id) {
        await (0, notifications_service_1.notify)({
            userId: club.leader_id,
            eventType: 'membership_requested',
            title: 'New Membership Request',
            body: `${req.user.name} has requested to join "${club.name}".`,
            type: 'info',
        });
    }
    res.status(201).json(membership);
}
function leaveClub(req, res) {
    const clubId = parseInt(req.params.id);
    const userId = req.user.id;
    const existing = membership_model_1.MembershipModel.findByClubAndUser(clubId, userId);
    if (!existing || existing.status === 'inactive') {
        res.status(404).json({ error: 'Membership not found' });
        return;
    }
    membership_model_1.MembershipModel.updateStatus(existing.id, 'inactive');
    res.status(204).send();
}
function listMembers(req, res) {
    const clubId = parseInt(req.params.id);
    const user = req.user;
    if (!(0, ownership_service_1.canManageClub)(user, clubId)) {
        res.status(403).json({ error: 'You do not have permission to view members of this club' });
        return;
    }
    const status = req.query.status;
    const members = membership_model_1.MembershipModel.findByClub(clubId, status);
    res.json({ data: members });
}
async function updateMembership(req, res) {
    const clubId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const { status } = req.body;
    const user = req.user;
    if (!['active', 'inactive'].includes(status)) {
        res.status(400).json({ error: 'status must be active or inactive' });
        return;
    }
    if (!(0, ownership_service_1.canManageClub)(user, clubId)) {
        res.status(403).json({ error: 'You do not have permission to manage members of this club' });
        return;
    }
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const membership = membership_model_1.MembershipModel.findByClubAndUser(clubId, targetUserId);
    if (!membership) {
        res.status(404).json({ error: 'Membership not found' });
        return;
    }
    const updated = membership_model_1.MembershipModel.updateStatus(membership.id, status);
    (0, audit_service_1.logAction)({ actorId: user.id, action: `membership_${status}`, entityType: 'membership', entityId: membership.id });
    if (status === 'active') {
        await (0, notifications_service_1.notify)({
            userId: targetUserId,
            eventType: 'membership_approved',
            title: 'Membership Approved',
            body: `Your membership request to "${club.name}" has been approved.`,
            type: 'success',
        });
    }
    else {
        await (0, notifications_service_1.notify)({
            userId: targetUserId,
            eventType: 'membership_declined',
            title: 'Membership Declined',
            body: `Your membership request to "${club.name}" was declined.`,
            type: 'error',
        });
    }
    res.json(updated);
}
function getMembership(req, res) {
    const clubId = parseInt(req.params.id);
    const userId = req.user.id;
    const membership = membership_model_1.MembershipModel.findByClubAndUser(clubId, userId);
    res.json(membership ?? null);
}
//# sourceMappingURL=membership.controller.js.map