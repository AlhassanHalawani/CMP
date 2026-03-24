"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAchievementReport = generateAchievementReport;
exports.generateKpiReport = generateKpiReport;
const pdfkit_1 = __importDefault(require("pdfkit"));
const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
const achievement_model_1 = require("../models/achievement.model");
const attendance_model_1 = require("../models/attendance.model");
const user_model_1 = require("../models/user.model");
const semester_model_1 = require("../models/semester.model");
async function generateAchievementReport(userId, opts = {}) {
    const user = user_model_1.UserModel.findById(userId);
    const semester = opts.semesterId ? semester_model_1.SemesterModel.findById(opts.semesterId) : undefined;
    const achievements = achievement_model_1.AchievementModel.findByUserFiltered(userId, {
        semesterId: opts.semesterId,
        clubId: opts.clubId,
    });
    const attendanceRecords = attendance_model_1.AttendanceModel.findByUserWithEvents(userId, {
        semesterStartsAt: semester?.starts_at,
        semesterEndsAt: semester?.ends_at,
    });
    const reportDate = opts.reportDate ?? new Date().toISOString().slice(0, 10);
    // Derive student ID from email prefix (e.g. s123456789@stu.kau.edu.sa → s123456789)
    const studentId = user?.email ? user.email.split('@')[0] : `user-${userId}`;
    // Verification hash: sha256(userId + semesterId + reportDate)
    const hashInput = `${userId}:${opts.semesterId ?? 'all'}:${reportDate}`;
    const verificationCode = crypto_1.default.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
    const qrDataUrl = await qrcode_1.default.toDataURL(verificationCode);
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // ── Header ──────────────────────────────────────────────────────────────
        doc.fontSize(18).font('Helvetica-Bold').text('CMP — King Abdulaziz University', { align: 'center' });
        doc.fontSize(14).font('Helvetica').text('Achievement Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).text(`Student: ${user?.name ?? `User #${userId}`}   ID: ${studentId}`, { align: 'center' });
        doc.fontSize(10).text(`Term: ${semester?.name ?? 'All Terms'}`, { align: 'center' });
        doc.fontSize(9).fillColor('#666').text(`Generated: ${reportDate}`, { align: 'center' });
        doc.fillColor('#000');
        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(1);
        // ── Summary ─────────────────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').text('Summary');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(`Total Achievements: ${achievements.length}`);
        doc.text(`Events Attended: ${attendanceRecords.length}`);
        doc.moveDown(1.5);
        // ── Achievements ─────────────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').text('Achievements');
        doc.moveDown(0.5);
        if (achievements.length === 0) {
            doc.fontSize(10).font('Helvetica').fillColor('#666').text('No achievements recorded.');
            doc.fillColor('#000');
        }
        else {
            for (const a of achievements) {
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(a.title, { continued: false });
                doc.fontSize(9).font('Helvetica').fillColor('#444').text(`Club ID: ${a.club_id}   |   Awarded: ${a.awarded_at.slice(0, 10)}`);
                if (a.description) {
                    doc.fontSize(9).fillColor('#666').text(a.description);
                }
                doc.fillColor('#000').moveDown(0.5);
            }
        }
        doc.moveDown(1);
        // ── Attendance ───────────────────────────────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Attendance');
        doc.moveDown(0.5);
        if (attendanceRecords.length === 0) {
            doc.fontSize(10).font('Helvetica').fillColor('#666').text('No attendance records.');
            doc.fillColor('#000');
        }
        else {
            // Column headers
            const colX = [50, 240, 360, 460];
            const headers = ['Event', 'Date', 'Check-in', 'Method'];
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
            headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: (colX[i + 1] ?? 560) - colX[i] - 5, continued: i < headers.length - 1 }));
            doc.moveDown(0.3);
            doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#ccc').stroke();
            doc.moveDown(0.3);
            for (const rec of attendanceRecords) {
                const y = doc.y;
                doc.fontSize(9).font('Helvetica').fillColor('#000');
                const cells = [
                    rec.event_title.slice(0, 28),
                    rec.event_date.slice(0, 10),
                    rec.checked_in_at.slice(11, 16),
                    rec.method,
                ];
                cells.forEach((c, i) => doc.text(c, colX[i], y, { width: (colX[i + 1] ?? 560) - colX[i] - 5, continued: i < cells.length - 1 }));
                doc.moveDown(0.5);
            }
        }
        doc.moveDown(1.5);
        // ── Verification ─────────────────────────────────────────────────────────
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(0.8);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text('Verification');
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').text(`Verification Code: ${verificationCode}`);
        doc.moveDown(0.5);
        doc.image(qrBuffer, { fit: [80, 80] });
        doc.moveDown(3);
        doc.fontSize(8).fillColor('#999').text('Generated by CMP — Clubs Management Platform', { align: 'center' });
        doc.end();
    });
}
async function generateKpiReport(leaderboard, semesterName) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text(`KPI Report — ${semesterName}`, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#666')
            .text(`Generated: ${new Date().toISOString().slice(0, 10)}`, { align: 'center' });
        doc.moveDown(1.5);
        // Column layout
        const colX = [50, 120, 250, 320, 390, 460, 510];
        const headers = ['Rank', 'Club', 'Dept', 'Attend.', 'Achiev.', 'Members', 'Score'];
        doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 5 : 60, continued: i < headers.length - 1 }));
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(0.4);
        for (const [idx, club] of leaderboard.entries()) {
            // Highlight top 3
            if (club.rank <= 3) {
                const medal = club.rank === 1 ? '#FFD700' : club.rank === 2 ? '#C0C0C0' : '#CD7F32';
                doc.rect(45, doc.y - 2, 520, 14).fillColor(medal).fillOpacity(0.15).fill();
                doc.fillOpacity(1);
            }
            const y = doc.y;
            doc.fillColor('#000').fontSize(9).font(club.rank <= 3 ? 'Helvetica-Bold' : 'Helvetica');
            const cells = [
                String(club.rank),
                club.club_name.slice(0, 18),
                (club.department ?? '—').slice(0, 10),
                String(club.attendance_count),
                String(club.achievement_count),
                String(club.member_count),
                String(club.total_score),
            ];
            cells.forEach((c, i) => {
                doc.text(c, colX[i], y, { width: colX[i + 1] ? colX[i + 1] - colX[i] - 5 : 60, continued: i < cells.length - 1 });
            });
            doc.moveDown(0.5);
            // Separator every row
            if (idx < leaderboard.length - 1) {
                doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#eee').stroke();
                doc.moveDown(0.2);
            }
        }
        // Footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#999').text('Generated by CMP — Clubs Management Platform', { align: 'center' });
        doc.end();
    });
}
//# sourceMappingURL=pdf.service.js.map