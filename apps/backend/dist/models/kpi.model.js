"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KpiModel = void 0;
const database_1 = require("../config/database");
exports.KpiModel = {
    recordMetric(data) {
        const result = database_1.db
            .prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
            .run(data.club_id, data.semester_id || null, data.metric_key, data.metric_value);
        return database_1.db.prepare('SELECT * FROM kpi_metrics WHERE id = ?').get(result.lastInsertRowid);
    },
    getClubSummary(clubId, semesterId) {
        let sql = 'SELECT club_id, metric_key, SUM(metric_value) as total FROM kpi_metrics WHERE club_id = ?';
        const values = [clubId];
        if (semesterId) {
            sql += ' AND semester_id = ?';
            values.push(semesterId);
        }
        sql += ' GROUP BY metric_key';
        return database_1.db.prepare(sql).all(...values);
    },
    getLeaderboard(semesterId, department) {
        const conditions = [];
        const values = [];
        if (semesterId) {
            conditions.push("km.semester_id = ?");
            values.push(semesterId);
        }
        if (department) {
            conditions.push("c.department = ?");
            values.push(department);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `
      SELECT
        c.id        AS club_id,
        c.name      AS club_name,
        c.department,
        COALESCE(SUM(CASE WHEN km.metric_key = 'attendance_count'  THEN km.metric_value END), 0) AS attendance_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'achievement_count' THEN km.metric_value END), 0) AS achievement_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'member_count'      THEN km.metric_value END), 0) AS member_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'total_score'       THEN km.metric_value END), 0) AS total_score
      FROM kpi_metrics km
      JOIN clubs c ON c.id = km.club_id
      ${where}
      GROUP BY km.club_id
      ORDER BY total_score DESC
    `;
        const rows = database_1.db.prepare(sql).all(...values);
        // Apply tied-rank logic in application code
        let rank = 1;
        return rows.map((row, i) => {
            if (i > 0 && row.total_score < rows[i - 1].total_score)
                rank = i + 1;
            return { ...row, rank };
        });
    },
    computeKpi(semesterId) {
        const semester = database_1.db.prepare('SELECT * FROM semesters WHERE id = ?').get(semesterId);
        if (!semester)
            throw new Error(`Semester ${semesterId} not found`);
        const { starts_at, ends_at } = semester;
        const computedKeys = ['attendance_count', 'achievement_count', 'member_count', 'total_score'];
        database_1.db.transaction(() => {
            // Delete old computed rows for this semester
            database_1.db.prepare(`DELETE FROM kpi_metrics WHERE semester_id = ? AND metric_key IN (${computedKeys.map(() => '?').join(',')})`).run(semesterId, ...computedKeys);
            // Attendance count per club
            const attendances = database_1.db.prepare(`
        SELECT e.club_id, COUNT(a.id) AS cnt
        FROM attendance a
        JOIN events e ON e.id = a.event_id
        WHERE e.status = 'published'
          AND a.checked_in_at BETWEEN ? AND ?
        GROUP BY e.club_id
      `).all(starts_at, ends_at);
            for (const row of attendances) {
                database_1.db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
                    .run(row.club_id, semesterId, 'attendance_count', row.cnt);
            }
            // Achievement count per club
            const achievements = database_1.db.prepare(`
        SELECT club_id, COUNT(id) AS cnt
        FROM achievements
        WHERE awarded_at BETWEEN ? AND ?
        GROUP BY club_id
      `).all(starts_at, ends_at);
            for (const row of achievements) {
                database_1.db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
                    .run(row.club_id, semesterId, 'achievement_count', row.cnt);
            }
            // Active member count per club
            const members = database_1.db.prepare(`
        SELECT club_id, COUNT(*) AS cnt
        FROM memberships WHERE status = 'active'
        GROUP BY club_id
      `).all();
            for (const row of members) {
                database_1.db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
                    .run(row.club_id, semesterId, 'member_count', row.cnt);
            }
            // Build a map of all affected club_ids
            const clubIds = new Set([
                ...attendances.map((r) => r.club_id),
                ...achievements.map((r) => r.club_id),
                ...members.map((r) => r.club_id),
            ]);
            // Total score = attendance_count + achievement_count
            for (const clubId of clubIds) {
                const attRow = attendances.find((r) => r.club_id === clubId);
                const achRow = achievements.find((r) => r.club_id === clubId);
                const total = (attRow?.cnt ?? 0) + (achRow?.cnt ?? 0);
                database_1.db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
                    .run(clubId, semesterId, 'total_score', total);
            }
        })();
        return database_1.db.prepare(`
      SELECT COUNT(DISTINCT club_id) AS n
      FROM kpi_metrics
      WHERE semester_id = ? AND metric_key = 'total_score'
    `).get(semesterId).n;
    },
};
//# sourceMappingURL=kpi.model.js.map