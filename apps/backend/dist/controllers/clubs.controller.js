"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClubs = listClubs;
exports.getClub = getClub;
exports.createClub = createClub;
exports.updateClub = updateClub;
exports.deleteClub = deleteClub;
const club_model_1 = require("../models/club.model");
const audit_service_1 = require("../services/audit.service");
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
    const existing = club_model_1.ClubModel.findById(id);
    if (!existing) {
        res.status(404).json({ error: 'Club not found' });
        return;
    }
    const club = club_model_1.ClubModel.update(id, req.body);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'update', entityType: 'club', entityId: id });
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
//# sourceMappingURL=clubs.controller.js.map