"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listForUser = listForUser;
exports.listForClub = listForClub;
exports.create = create;
exports.remove = remove;
exports.downloadReport = downloadReport;
const achievement_model_1 = require("../models/achievement.model");
const pdf_service_1 = require("../services/pdf.service");
const audit_service_1 = require("../services/audit.service");
function listForUser(req, res) {
    const userId = parseInt(req.params.userId);
    const achievements = achievement_model_1.AchievementModel.findByUser(userId);
    res.json({ data: achievements });
}
function listForClub(req, res) {
    const clubId = parseInt(req.params.clubId);
    const achievements = achievement_model_1.AchievementModel.findByClub(clubId);
    res.json({ data: achievements });
}
function create(req, res) {
    const achievement = achievement_model_1.AchievementModel.create(req.body);
    (0, audit_service_1.logAction)({
        actorId: req.user.id,
        action: 'create',
        entityType: 'achievement',
        entityId: achievement.id,
    });
    res.status(201).json(achievement);
}
function remove(req, res) {
    const id = parseInt(req.params.id);
    const deleted = achievement_model_1.AchievementModel.delete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Achievement not found' });
        return;
    }
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'delete', entityType: 'achievement', entityId: id });
    res.status(204).send();
}
async function downloadReport(req, res) {
    const userId = parseInt(req.params.userId);
    const pdfBuffer = await (0, pdf_service_1.generateAchievementReport)(userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=achievements-${userId}.pdf`);
    res.send(pdfBuffer);
}
//# sourceMappingURL=achievements.controller.js.map