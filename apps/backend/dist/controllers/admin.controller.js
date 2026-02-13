"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = getStats;
exports.getAuditLog = getAuditLog;
exports.listSemesters = listSemesters;
exports.createSemester = createSemester;
exports.setActiveSemester = setActiveSemester;
exports.deleteSemester = deleteSemester;
const user_model_1 = require("../models/user.model");
const club_model_1 = require("../models/club.model");
const event_model_1 = require("../models/event.model");
const auditLog_model_1 = require("../models/auditLog.model");
const semester_model_1 = require("../models/semester.model");
const audit_service_1 = require("../services/audit.service");
function getStats(_req, res) {
    res.json({
        users: user_model_1.UserModel.count(),
        clubs: club_model_1.ClubModel.count(),
        events: event_model_1.EventModel.count(),
    });
}
function getAuditLog(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const entityType = req.query.entity_type;
    const logs = auditLog_model_1.AuditLogModel.list({ limit, offset, entity_type: entityType });
    res.json({ data: logs });
}
function listSemesters(_req, res) {
    res.json({ data: semester_model_1.SemesterModel.list() });
}
function createSemester(req, res) {
    const semester = semester_model_1.SemesterModel.create(req.body);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'create', entityType: 'semester', entityId: semester.id });
    res.status(201).json(semester);
}
function setActiveSemester(req, res) {
    const id = parseInt(req.params.id);
    const semester = semester_model_1.SemesterModel.findById(id);
    if (!semester) {
        res.status(404).json({ error: 'Semester not found' });
        return;
    }
    semester_model_1.SemesterModel.setActive(id);
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'set_active', entityType: 'semester', entityId: id });
    res.json(semester_model_1.SemesterModel.findById(id));
}
function deleteSemester(req, res) {
    const id = parseInt(req.params.id);
    const deleted = semester_model_1.SemesterModel.delete(id);
    if (!deleted) {
        res.status(404).json({ error: 'Semester not found' });
        return;
    }
    (0, audit_service_1.logAction)({ actorId: req.user.id, action: 'delete', entityType: 'semester', entityId: id });
    res.status(204).send();
}
//# sourceMappingURL=admin.controller.js.map