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
        const semesterJoin = semesterId ? 'AND km.semester_id = ?' : '';
        const values = [clubId, clubId];
        if (semesterId)
            values.push(semesterId, semesterId, semesterId, semesterId);
        const sql = `
      WITH keys(metric_key) AS (
        VALUES ('attendance_count'), ('achievement_count'), ('member_count'), ('total_score')
      )
      SELECT
        ? AS club_id,
        k.metric_key,
        COALESCE(SUM(km.metric_value), 0) AS total
      FROM keys k
      LEFT JOIN kpi_metrics km
        ON km.club_id = ? AND km.metric_key = k.metric_key ${semesterJoin}
      GROUP BY k.metric_key
      ORDER BY k.metric_key
    `;
        // semesterId appears once per ? placeholder in the join
        const params = [clubId, clubId];
        if (semesterId)
            params.push(semesterId);
        return database_1.db.prepare(sql).all(...params);
    },
    getLeaderboard(semesterId, department) {
        // semester filter must be a JOIN condition so LEFT JOIN is preserved for clubs with no KPI rows
        const semesterJoin = semesterId ? 'AND km.semester_id = ?' : '';
        const departmentWhere = department ? 'WHERE c.department = ?' : '';
        const params = [];
        if (semesterId)
            params.push(semesterId);
        if (department)
            params.push(department);
        const sql = `
      SELECT
        c.id        AS club_id,
        c.name      AS club_name,
        c.department,
        COALESCE(SUM(CASE WHEN km.metric_key = 'attendance_count'  THEN km.metric_value END), 0) AS attendance_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'achievement_count' THEN km.metric_value END), 0) AS achievement_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'member_count'      THEN km.metric_value END), 0) AS member_count,
        COALESCE(SUM(CASE WHEN km.metric_key = 'total_score'       THEN km.metric_value END), 0) AS total_score
      FROM clubs c
      LEFT JOIN kpi_metrics km ON km.club_id = c.id ${semesterJoin}
      ${departmentWhere}
      GROUP BY c.id
      ORDER BY total_score DESC, c.name ASC
    `;
        const rows = database_1.db.prepare(sql).all(...params);
        // Apply tied-rank logic in application code
        let rank = 1;
        return rows.map((row, i) => {
            if (i > 0 && row.total_score < rows[i - 1].total_score)
                rank = i + 1;
            return { ...row, rank };
        });
    },
    getStudentKpi(semesterId) {
        // Build semester-aware attendance and achievement subqueries using parameterized joins
        const attSemJoin = semesterId
            ? 'JOIN semesters sem_a ON sem_a.id = ? AND a.checked_in_at BETWEEN sem_a.starts_at AND sem_a.ends_at'
            : '';
        const achSemJoin = semesterId
            ? 'JOIN semesters sem_c ON sem_c.id = ? AND ach.awarded_at BETWEEN sem_c.starts_at AND sem_c.ends_at'
            : '';
        const sql = `
      SELECT
        u.id   AS user_id,
        u.name,
        u.email,
        COALESCE(att.attendance_count,   0) AS attendance_count,
        COALESCE(ach.achievement_count,  0) AS achievement_count,
        COALESCE(reg.registration_count, 0) AS registration_count,
        COALESCE(mem.active_memberships, 0) AS active_memberships,
        (COALESCE(att.attendance_count, 0) + COALESCE(ach.achievement_count, 0)) AS engagement_score
      FROM users u
      LEFT JOIN (
        SELECT a.user_id, COUNT(*) AS attendance_count
        FROM attendance a
        JOIN events e ON e.id = a.event_id AND e.status = 'published'
        ${attSemJoin}
        GROUP BY a.user_id
      ) att ON att.user_id = u.id
      LEFT JOIN (
        SELECT ach.user_id, COUNT(*) AS achievement_count
        FROM achievements ach
        ${achSemJoin}
        GROUP BY ach.user_id
      ) ach ON ach.user_id = u.id
      LEFT JOIN (
        SELECT r.user_id, COUNT(*) AS registration_count
        FROM registrations r
        GROUP BY r.user_id
      ) reg ON reg.user_id = u.id
      LEFT JOIN (
        SELECT m.user_id, COUNT(*) AS active_memberships
        FROM memberships m
        WHERE m.status = 'active'
        GROUP BY m.user_id
      ) mem ON mem.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY engagement_score DESC, u.name ASC
    `;
        const params = [];
        if (semesterId)
            params.push(semesterId); // for attSemJoin
        if (semesterId)
            params.push(semesterId); // for achSemJoin
        const rows = database_1.db.prepare(sql).all(...params);
        let rank = 1;
        return rows.map((row, i) => {
            if (i > 0 && row.engagement_score < rows[i - 1].engagement_score)
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