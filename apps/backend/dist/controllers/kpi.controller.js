"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.recordMetric = recordMetric;
exports.getClubSummary = getClubSummary;
exports.getLeaderboard = getLeaderboard;
exports.getStudentKpi = getStudentKpi;
exports.computeKpi = computeKpi;
const kpi_model_1 = require("../models/kpi.model");
const ownership_service_1 = require("../services/ownership.service");
const pdf_service_1 = require("../services/pdf.service");
const database_1 = require("../config/database");
function getOverview(req, res) {
    const user = req.user;
    const clubIdParam = req.query.club_id ? parseInt(req.query.club_id) : undefined;
    if ((0, ownership_service_1.isAdmin)(user)) {
        return res.json(kpi_model_1.KpiModel.getOverview({ clubId: clubIdParam }));
    }
    // Club leader: resolve their owned club via clubs.leader_id, not a user column
    const ownedClub = database_1.db
        .prepare('SELECT id FROM clubs WHERE leader_id = ?')
        .get(user.id);
    if (!ownedClub) {
        return res.status(403).json({ error: 'You do not lead any club' });
    }
    if (clubIdParam && clubIdParam !== ownedClub.id) {
        return res.status(403).json({ error: 'You can only view overview for your own club' });
    }
    return res.json(kpi_model_1.KpiModel.getOverview({ clubId: ownedClub.id }));
}
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
async function getLeaderboard(req, res) {
    const semesterId = req.query.semester_id ? parseInt(req.query.semester_id) : undefined;
    const department = req.query.department;
    const format = req.query.format;
    const leaderboard = kpi_model_1.KpiModel.getLeaderboard(semesterId, department);
    if (format === 'csv') {
        const rows = [['Rank', 'Club', 'Department', 'Attendance', 'Members']];
        for (const club of leaderboard) {
            rows.push([
                String(club.rank),
                club.club_name,
                club.department ?? '',
                String(club.attendance_count),
                String(club.member_count),
            ]);
        }
        const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=kpi-leaderboard.csv');
        return res.send(csv);
    }
    if (format === 'pdf') {
        let semesterName = 'All Time';
        if (semesterId) {
            const s = database_1.db.prepare('SELECT name FROM semesters WHERE id = ?').get(semesterId);
            if (s)
                semesterName = s.name;
        }
        const pdfBuffer = await (0, pdf_service_1.generateKpiReport)(leaderboard, semesterName);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=kpi-leaderboard.pdf');
        return res.send(pdfBuffer);
    }
    res.json({ data: leaderboard });
}
function getStudentKpi(req, res) {
    const semesterId = req.query.semester_id ? parseInt(req.query.semester_id) : undefined;
    const students = kpi_model_1.KpiModel.getStudentKpi(semesterId);
    res.json({ data: students });
}
function computeKpi(req, res) {
    const semesterId = parseInt(req.body.semester_id);
    if (!semesterId || isNaN(semesterId)) {
        res.status(400).json({ error: 'semester_id is required' });
        return;
    }
    try {
        const clubsUpdated = kpi_model_1.KpiModel.computeKpi(semesterId);
        res.json({ computed: true, semester_id: semesterId, clubs_updated: clubsUpdated });
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
}
//# sourceMappingURL=kpi.controller.js.map