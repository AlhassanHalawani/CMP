"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoUpload = void 0;
exports.listClubs = listClubs;
exports.getClub = getClub;
exports.createClub = createClub;
exports.updateClub = updateClub;
exports.deleteClub = deleteClub;
exports.getClubStats = getClubStats;
exports.assignClubLeader = assignClubLeader;
exports.uploadLogo = uploadLogo;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const club_model_1 = require("../models/club.model");
const user_model_1 = require("../models/user.model");
const database_1 = require("../config/database");
const audit_service_1 = require("../services/audit.service");
const ownership_service_1 = require("../services/ownership.service");
const keycloakAdmin_service_1 = require("../services/keycloakAdmin.service");
const logger_1 = require("../utils/logger");
const uploadsDir = path_1.default.resolve('./data/uploads/logos');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => cb(null, `club-${Date.now()}${path_1.default.extname(file.originalname)}`),
});
exports.logoUpload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
        cb(null, true);
    },
});
function listClubs(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const clubs = club_model_1.ClubModel.list({ limit, offset });
    const total = club_model_1.ClubModel.count();
    res.json({ data: clubs, total });
}
function getClub(req, res) {
    const club = club_model_1.ClubModel.findById(parseInt(req.params.id));
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    res.json(club);
}
function createClub(req, res) {
    const { name, name_ar, description, description_ar, logo_url, leader_id } = req.body;
    const club = club_model_1.ClubModel.create({ name, name_ar, description, description_ar, logo_url, leader_id });
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'create', entityType: 'club', entityId: club.id });
    res.status(201).json(club);
}
function updateClub(req, res) {
    const id = parseInt(req.params.id);
    const user = req.user;
    const existing = club_model_1.ClubModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    // club_leader may only update their own club
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, id)) {
        res.status(403).json({ error: 'You do not have permission to update this club' });
        return;
    }
    // Only admin can change club leadership
    if (!(0, ownership_service_1.isAdmin)(user) && 'leader_id' in req.body) {
        res.status(403).json({ error: 'Only admins can change club leadership' });
        return;
    }
    const club = club_model_1.ClubModel.update(id, req.body);
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'update', entityType: 'club', entityId: id });
    res.json(club);
}
function deleteClub(req, res) {
    const id = parseInt(req.params.id);
    const deleted = club_model_1.ClubModel.delete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'delete', entityType: 'club', entityId: id });
    res.status(204).send();
}
function getClubStats(req, res) {
    const clubId = parseInt(req.params.id);
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const { published_events } = database_1.db
        .prepare(`SELECT COUNT(*) AS published_events FROM events WHERE club_id = ? AND status = 'published'`)
        .get(clubId);
    const { total_attendance } = database_1.db
        .prepare(`SELECT COUNT(a.id) AS total_attendance
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE e.club_id = ? AND e.status = 'published'`)
        .get(clubId);
    const { achievements_awarded } = database_1.db
        .prepare(`SELECT COUNT(*) AS achievements_awarded FROM achievements WHERE club_id = ?`)
        .get(clubId);
    const { active_members } = database_1.db
        .prepare(`SELECT COUNT(*) AS active_members FROM memberships WHERE club_id = ? AND status = 'active'`)
        .get(clubId);
    res.json({ published_events, total_attendance, achievements_awarded, active_members });
}
/**
 * POST /api/clubs/:id/assign-leader  (admin only)
 * Body: { user_id: number }
 * Atomically:
 *   1. Sets club.leader_id = user_id
 *   2. Promotes the new user to club_leader role
 *   3. Demotes the previous leader back to student if they no longer lead any club
 */
function assignClubLeader(req, res) {
    const clubId = parseInt(req.params.id);
    const newLeaderId = req.body.user_id;
    if (!newLeaderId) {
        res.status(400).json({ error: 'user_id is required' });
        return;
    }
    const club = club_model_1.ClubModel.findById(clubId);
    if (!club) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const newLeader = user_model_1.UserModel.findById(newLeaderId);
    if (!newLeader) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const previousLeaderId = club.leader_id;
    database_1.db.transaction(() => {
        // Assign the leader
        club_model_1.ClubModel.update(clubId, { leader_id: newLeaderId });
        // Promote new leader
        user_model_1.UserModel.updateRole(newLeaderId, 'club_leader');
        // Demote previous leader if they no longer lead any other club
        if (previousLeaderId && previousLeaderId !== newLeaderId) {
            const stillLeads = database_1.db.prepare('SELECT COUNT(*) as cnt FROM clubs WHERE leader_id = ? AND id != ?').get(previousLeaderId, clubId).cnt;
            if (stillLeads === 0) {
                user_model_1.UserModel.updateRole(previousLeaderId, 'student');
            }
        }
    })();
    (0, audit_service_1.logAction)({
        actorId: req.user.id,
        action: 'assign_club_leader',
        entityType: 'club',
        entityId: clubId,
        payload: { new_leader_id: newLeaderId, previous_leader_id: previousLeaderId },
    });
    // Sync Keycloak realm roles to match the DB changes made in the transaction.
    // Best-effort — failures are logged but do not affect the response.
    const syncPromises = [
        (0, keycloakAdmin_service_1.syncUserRealmRole)(newLeader.keycloak_id, 'club_leader', newLeader.role),
    ];
    if (previousLeaderId && previousLeaderId !== newLeaderId) {
        const prevLeader = user_model_1.UserModel.findById(previousLeaderId);
        if (prevLeader) {
            // Determine what the transaction set their role to
            const updatedPrev = user_model_1.UserModel.findById(previousLeaderId);
            syncPromises.push((0, keycloakAdmin_service_1.syncUserRealmRole)(prevLeader.keycloak_id, updatedPrev?.role ?? 'student', 'club_leader'));
        }
    }
    Promise.all(syncPromises).catch((err) => {
        logger_1.logger.warn(`Keycloak role sync failed for assignClubLeader on club ${clubId}: ${err.message}`);
    });
    res.json(club_model_1.ClubModel.findById(clubId));
}
function uploadLogo(req, res) {
    const id = parseInt(req.params.id);
    const user = req.user;
    const existing = club_model_1.ClubModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    if (!(0, ownership_service_1.isAdmin)(user) && !(0, ownership_service_1.leaderOwnsClub)(user.id, id)) {
        res.status(403).json({ error: 'You do not have permission to update this club' });
        return;
    }
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const logo_url = `/uploads/logos/${req.file.filename}`;
    const club = club_model_1.ClubModel.update(id, { logo_url });
    (0, audit_service_1.logAction)({ actorId: user.id, action: 'update', entityType: 'club', entityId: id });
    res.json(club);
}
//# sourceMappingURL=clubs.controller.js.map