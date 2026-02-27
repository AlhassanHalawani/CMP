"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMetric = recordMetric;
exports.getClubSummary = getClubSummary;
exports.getLeaderboard = getLeaderboard;
const kpi_model_1 = require("../models/kpi.model");
const ownership_service_1 = require("../services/ownership.service");
function recordMetric(req, res) {
    const user = req.user;
    const clubId = req.body.club_id;
    // club_leader can only record metrics for clubs they lead
    if (!(0, ownership_service_1.isAdmin)(user)) {
        if (!clubId || !(0, ownership_service_1.leaderOwnsClub)(user.id, clubId)) {
            res.status(403).json({ error: 'You can only record metrics for clubs you lead' });
            return;
        }
    }
    const metric = kpi_model_1.KpiModel.recordMetric(req.body);
    res.status(201).json(metric);
}
function getClubSummary(req, res) {
    const clubId = parseInt(req.params.clubId);
    const semesterId = req.query.semester_id ? parseInt(req.query.semester_id) : undefined;
    const summary = kpi_model_1.KpiModel.getClubSummary(clubId, semesterId);
    res.json({ data: summary });
}
function getLeaderboard(req, res) {
    const semesterId = req.query.semester_id ? parseInt(req.query.semester_id) : undefined;
    const leaderboard = kpi_model_1.KpiModel.getLeaderboard(semesterId);
    res.json({ data: leaderboard });
}
//# sourceMappingURL=kpi.controller.js.map