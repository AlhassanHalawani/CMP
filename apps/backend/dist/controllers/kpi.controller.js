"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMetric = recordMetric;
exports.getClubSummary = getClubSummary;
exports.getLeaderboard = getLeaderboard;
const kpi_model_1 = require("../models/kpi.model");
function recordMetric(req, res) {
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