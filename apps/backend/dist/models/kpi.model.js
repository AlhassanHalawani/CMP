"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KpiModel = void 0;
const database_1 = require("../config/database");
function buildMonthBuckets(windowMonths) {
    const buckets = [];
    const now = new Date();
    for (let i = windowMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short' });
        buckets.push({ month, label });
    }
    return buckets;
}
function zeroFillSeries(rows, buckets) {
    const map = new Map(rows.map((r) => [r.month, r.value]));
    return buckets.map((b) => ({ ...b, value: map.get(b.month) ?? 0 }));
}
exports.KpiModel = {
    recordMetric(data) {
        const result = database_1.db
            .prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
            .run(data.club_id, data.semester_id || null, data.metric_key, data.metric_value);
        return database_1.db.prepare('SELECT * FROM kpi_metrics WHERE id = ?').get(result.lastInsertRowid);
    },
    getClubSummary(clubId, semesterId) {
        const semAttWhere = semesterId
            ? `AND a.checked_in_at BETWEEN (SELECT starts_at FROM semesters WHERE id = ${semesterId}) AND (SELECT ends_at FROM semesters WHERE id = ${semesterId})`
            : '';
        const { attendance_count } = database_1.db.prepare(`
      SELECT COUNT(a.id) AS attendance_count
      FROM attendance a
      JOIN events e ON e.id = a.event_id AND e.status = 'published' AND e.club_id = ?
      ${semAttWhere}
    `).get(clubId);
        const { member_count } = database_1.db.prepare(`
      SELECT COUNT(*) AS member_count FROM memberships WHERE club_id = ? AND status = 'active'
    `).get(clubId);
        return [
            { club_id: clubId, metric_key: 'attendance_count', total: attendance_count },
            { club_id: clubId, metric_key: 'member_count', total: member_count },
        ];
    },
    getLeaderboard(semesterId, department) {
        const semAttJoin = semesterId
            ? `JOIN semesters sem_a ON sem_a.id = ${semesterId} AND a.checked_in_at BETWEEN sem_a.starts_at AND sem_a.ends_at`
            : '';
        const departmentWhere = department ? 'WHERE c.department = ?' : '';
        const params = [];
        if (department)
            params.push(department);
        const sql = `
      SELECT
        c.id AS club_id,
        c.name AS club_name,
        c.department,
        COALESCE(att.attendance_count, 0) AS attendance_count,
        COALESCE(mem.member_count, 0) AS member_count
      FROM clubs c
      LEFT JOIN (
        SELECT e.club_id, COUNT(a.id) AS attendance_count
        FROM attendance a
        JOIN events e ON e.id = a.event_id AND e.status = 'published'
        ${semAttJoin}
        GROUP BY e.club_id
      ) att ON att.club_id = c.id
      LEFT JOIN (
        SELECT m.club_id, COUNT(*) AS member_count
        FROM memberships m WHERE m.status = 'active'
        GROUP BY m.club_id
      ) mem ON mem.club_id = c.id
      ${departmentWhere}
      ORDER BY attendance_count DESC, member_count DESC, c.name ASC
    `;
        const rows = database_1.db.prepare(sql).all(...params);
        let rank = 1;
        return rows.map((row, i) => {
            if (i > 0 && row.attendance_count < rows[i - 1].attendance_count)
                rank = i + 1;
            return { ...row, rank };
        });
    },
    getStudentKpi(semesterId) {
        const attSemJoin = semesterId
            ? 'JOIN semesters sem_a ON sem_a.id = ? AND a.checked_in_at BETWEEN sem_a.starts_at AND sem_a.ends_at'
            : '';
        const sql = `
      SELECT
        u.id   AS user_id,
        u.name,
        u.email,
        COALESCE(u.xp_total, 0) AS xp_total,
        COALESCE(att.attendance_count,   0) AS attendance_count,
        COALESCE(reg.registration_count, 0) AS registration_count,
        COALESCE(mem.active_memberships, 0) AS active_memberships
      FROM users u
      LEFT JOIN (
        SELECT a.user_id, COUNT(*) AS attendance_count
        FROM attendance a
        JOIN events e ON e.id = a.event_id AND e.status = 'published'
        ${attSemJoin}
        GROUP BY a.user_id
      ) att ON att.user_id = u.id
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
      ORDER BY xp_total DESC, u.name ASC
    `;
        const params = [];
        if (semesterId)
            params.push(semesterId); // for attSemJoin
        const rows = database_1.db.prepare(sql).all(...params);
        let rank = 1;
        return rows.map((row, i) => {
            if (i > 0 && row.xp_total < rows[i - 1].xp_total)
                rank = i + 1;
            return { ...row, rank };
        });
    },
    getOverview(options = {}) {
        const { clubId } = options;
        const scope = clubId ? 'club' : 'platform';
        // Build optional club filter fragments
        const eventsClubWhere = clubId ? ' AND club_id = ?' : '';
        const joinedClubWhere = clubId ? ' AND e.club_id = ?' : '';
        const cp = clubId ? [clubId] : [];
        // Summary: events count
        const eventsCountRow = database_1.db
            .prepare(`SELECT COUNT(*) AS v FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}`)
            .get(...cp);
        const events_count = eventsCountRow.v;
        // Summary: attendance count
        const attCountRow = database_1.db
            .prepare(`SELECT COUNT(a.id) AS v FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}`)
            .get(...cp);
        const attendance_count = attCountRow.v;
        // Summary: unique attendees
        const uniqueRow = database_1.db
            .prepare(`SELECT COUNT(DISTINCT a.user_id) AS v FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}`)
            .get(...cp);
        const unique_attendees = uniqueRow.v;
        // Summary: confirmed registrations count
        const regCountRow = database_1.db
            .prepare(`SELECT COUNT(r.id) AS v FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
           AND r.status = 'confirmed'${joinedClubWhere}`)
            .get(...cp);
        const registrations_count = regCountRow.v;
        // Summary: active clubs (distinct clubs with at least one published event in window)
        const activeClubsRow = database_1.db
            .prepare(`SELECT COUNT(DISTINCT club_id) AS v FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}`)
            .get(...cp);
        const active_clubs = activeClubsRow.v;
        const attendance_rate = registrations_count > 0 ? Math.round((attendance_count / registrations_count) * 100) : 0;
        const avg_attendance_per_event = events_count > 0
            ? Math.round((attendance_count / events_count) * 10) / 10
            : 0;
        // Series: events by month
        const eventsSeries = database_1.db
            .prepare(`SELECT strftime('%Y-%m', starts_at) AS month, COUNT(*) AS value FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}
         GROUP BY month`)
            .all(...cp);
        // Series: attendance by month (bucketed by event month)
        const attSeries = database_1.db
            .prepare(`SELECT strftime('%Y-%m', e.starts_at) AS month, COUNT(a.id) AS value
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}
         GROUP BY month`)
            .all(...cp);
        // Series: registrations by month (bucketed by event month)
        const regSeries = database_1.db
            .prepare(`SELECT strftime('%Y-%m', e.starts_at) AS month, COUNT(r.id) AS value
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
           AND r.status = 'confirmed'${joinedClubWhere}
         GROUP BY month`)
            .all(...cp);
        // Rankings: top clubs by events
        const topByEvents = database_1.db
            .prepare(`SELECT e.club_id, c.name AS club_name, COUNT(e.id) AS value
         FROM events e JOIN clubs c ON c.id = e.club_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
         GROUP BY e.club_id ORDER BY value DESC LIMIT 5`)
            .all();
        // Rankings: top clubs by attendance
        const topByAttendance = database_1.db
            .prepare(`SELECT e.club_id, c.name AS club_name, COUNT(a.id) AS value
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         JOIN clubs c ON c.id = e.club_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
         GROUP BY e.club_id ORDER BY value DESC LIMIT 5`)
            .all();
        const buckets = buildMonthBuckets(6);
        return {
            scope,
            window: '6m',
            summary: {
                events_count,
                attendance_count,
                registrations_count,
                unique_attendees,
                attendance_rate,
                avg_attendance_per_event,
                active_clubs,
            },
            series: {
                events_by_month: zeroFillSeries(eventsSeries, buckets),
                attendance_by_month: zeroFillSeries(attSeries, buckets),
                registrations_by_month: zeroFillSeries(regSeries, buckets),
            },
            rankings: {
                top_clubs_by_events: topByEvents,
                top_clubs_by_attendance: topByAttendance,
            },
        };
    },
    computeKpi(semesterId) {
        const semester = database_1.db.prepare('SELECT * FROM semesters WHERE id = ?').get(semesterId);
        if (!semester)
            throw new Error(`Semester ${semesterId} not found`);
        const { starts_at, ends_at } = semester;
        const computedKeys = ['attendance_count', 'member_count'];
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
        })();
        return database_1.db.prepare(`
      SELECT COUNT(DISTINCT club_id) AS n
      FROM kpi_metrics
      WHERE semester_id = ? AND metric_key = 'attendance_count'
    `).get(semesterId).n;
    },
};
//# sourceMappingURL=kpi.model.js.map