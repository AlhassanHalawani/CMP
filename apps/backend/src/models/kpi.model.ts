import { db } from '../config/database';

export interface MonthPoint {
  month: string;
  label: string;
  value: number;
}

export interface TopClubEntry {
  club_id: number;
  club_name: string;
  value: number;
}

export interface OverviewSummary {
  events_count: number;
  attendance_count: number;
  registrations_count: number;
  unique_attendees: number;
  attendance_rate: number;
  avg_attendance_per_event: number;
  active_clubs: number;
}

export interface KpiOverview {
  scope: 'platform' | 'club';
  window: '6m';
  summary: OverviewSummary;
  series: {
    events_by_month: MonthPoint[];
    attendance_by_month: MonthPoint[];
    registrations_by_month: MonthPoint[];
  };
  rankings: {
    top_clubs_by_events: TopClubEntry[];
    top_clubs_by_attendance: TopClubEntry[];
  };
}

export interface KpiMetric {
  id: number;
  club_id: number;
  semester_id: number | null;
  metric_key: string;
  metric_value: number;
  recorded_at: string;
}

export interface ClubKpiSummary {
  club_id: number;
  metric_key: string;
  total: number;
}

export interface LeaderboardEntry {
  club_id: number;
  club_name: string;
  department: string | null;
  attendance_count: number;
  member_count: number;
  // Club ranking formula: attendance_count DESC (primary), member_count DESC (tiebreaker)
  rank: number;
}

export interface StudentKpiEntry {
  user_id: number;
  name: string;
  email: string;
  xp_total: number;
  attendance_count: number;
  registration_count: number;
  active_memberships: number;
  rank: number;
}

function buildMonthBuckets(windowMonths: number): { month: string; label: string }[] {
  const buckets: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = windowMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short' });
    buckets.push({ month, label });
  }
  return buckets;
}

function zeroFillSeries(
  rows: { month: string; value: number }[],
  buckets: { month: string; label: string }[],
): MonthPoint[] {
  const map = new Map(rows.map((r) => [r.month, r.value]));
  return buckets.map((b) => ({ ...b, value: map.get(b.month) ?? 0 }));
}

export const KpiModel = {
  recordMetric(data: { club_id: number; semester_id?: number; metric_key: string; metric_value: number }): KpiMetric {
    const result = db
      .prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
      .run(data.club_id, data.semester_id || null, data.metric_key, data.metric_value);
    return db.prepare('SELECT * FROM kpi_metrics WHERE id = ?').get(result.lastInsertRowid) as KpiMetric;
  },

  getClubSummary(clubId: number, semesterId?: number): ClubKpiSummary[] {
    const semAttWhere = semesterId
      ? `AND a.checked_in_at BETWEEN (SELECT starts_at FROM semesters WHERE id = ${semesterId}) AND (SELECT ends_at FROM semesters WHERE id = ${semesterId})`
      : '';

    const { attendance_count } = db.prepare(`
      SELECT COUNT(a.id) AS attendance_count
      FROM attendance a
      JOIN events e ON e.id = a.event_id AND e.status = 'published' AND e.club_id = ?
      ${semAttWhere}
    `).get(clubId) as { attendance_count: number };

    const { member_count } = db.prepare(`
      SELECT COUNT(*) AS member_count FROM memberships WHERE club_id = ? AND status = 'active'
    `).get(clubId) as { member_count: number };

    return [
      { club_id: clubId, metric_key: 'attendance_count', total: attendance_count },
      { club_id: clubId, metric_key: 'member_count', total: member_count },
    ];
  },

  getLeaderboard(semesterId?: number, department?: string): LeaderboardEntry[] {
    const semAttJoin = semesterId
      ? `JOIN semesters sem_a ON sem_a.id = ${semesterId} AND a.checked_in_at BETWEEN sem_a.starts_at AND sem_a.ends_at`
      : '';
    const departmentWhere = department ? 'WHERE c.department = ?' : '';

    const params: any[] = [];
    if (department) params.push(department);

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

    const rows = db.prepare(sql).all(...params) as Omit<LeaderboardEntry, 'rank'>[];

    let rank = 1;
    return rows.map((row, i) => {
      if (i > 0 && row.attendance_count < (rows[i - 1] as any).attendance_count) rank = i + 1;
      return { ...row, rank };
    });
  },

  getStudentKpi(semesterId?: number): StudentKpiEntry[] {
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

    const params: any[] = [];
    if (semesterId) params.push(semesterId); // for attSemJoin

    const rows = db.prepare(sql).all(...params) as Omit<StudentKpiEntry, 'rank'>[];

    let rank = 1;
    return rows.map((row, i) => {
      if (i > 0 && row.xp_total < (rows[i - 1] as any).xp_total) rank = i + 1;
      return { ...row, rank };
    });
  },

  getOverview(options: { clubId?: number } = {}): KpiOverview {
    const { clubId } = options;
    const scope: 'platform' | 'club' = clubId ? 'club' : 'platform';

    // Build optional club filter fragments
    const eventsClubWhere = clubId ? ' AND club_id = ?' : '';
    const joinedClubWhere = clubId ? ' AND e.club_id = ?' : '';
    const cp = clubId ? [clubId] : [];

    // Summary: events count
    const eventsCountRow = db
      .prepare(
        `SELECT COUNT(*) AS v FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}`,
      )
      .get(...cp) as { v: number };
    const events_count = eventsCountRow.v;

    // Summary: attendance count
    const attCountRow = db
      .prepare(
        `SELECT COUNT(a.id) AS v FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}`,
      )
      .get(...cp) as { v: number };
    const attendance_count = attCountRow.v;

    // Summary: unique attendees
    const uniqueRow = db
      .prepare(
        `SELECT COUNT(DISTINCT a.user_id) AS v FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}`,
      )
      .get(...cp) as { v: number };
    const unique_attendees = uniqueRow.v;

    // Summary: confirmed registrations count
    const regCountRow = db
      .prepare(
        `SELECT COUNT(r.id) AS v FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
           AND r.status = 'confirmed'${joinedClubWhere}`,
      )
      .get(...cp) as { v: number };
    const registrations_count = regCountRow.v;

    // Summary: active clubs (distinct clubs with at least one published event in window)
    const activeClubsRow = db
      .prepare(
        `SELECT COUNT(DISTINCT club_id) AS v FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}`,
      )
      .get(...cp) as { v: number };
    const active_clubs = activeClubsRow.v;

    const attendance_rate =
      registrations_count > 0 ? Math.round((attendance_count / registrations_count) * 100) : 0;
    const avg_attendance_per_event =
      events_count > 0
        ? Math.round((attendance_count / events_count) * 10) / 10
        : 0;

    // Series: events by month
    const eventsSeries = db
      .prepare(
        `SELECT strftime('%Y-%m', starts_at) AS month, COUNT(*) AS value FROM events
         WHERE status = 'published' AND starts_at >= date('now', '-6 months')${eventsClubWhere}
         GROUP BY month`,
      )
      .all(...cp) as { month: string; value: number }[];

    // Series: attendance by month (bucketed by event month)
    const attSeries = db
      .prepare(
        `SELECT strftime('%Y-%m', e.starts_at) AS month, COUNT(a.id) AS value
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')${joinedClubWhere}
         GROUP BY month`,
      )
      .all(...cp) as { month: string; value: number }[];

    // Series: registrations by month (bucketed by event month)
    const regSeries = db
      .prepare(
        `SELECT strftime('%Y-%m', e.starts_at) AS month, COUNT(r.id) AS value
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
           AND r.status = 'confirmed'${joinedClubWhere}
         GROUP BY month`,
      )
      .all(...cp) as { month: string; value: number }[];

    // Rankings: top clubs by events
    const topByEvents = db
      .prepare(
        `SELECT e.club_id, c.name AS club_name, COUNT(e.id) AS value
         FROM events e JOIN clubs c ON c.id = e.club_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
         GROUP BY e.club_id ORDER BY value DESC LIMIT 5`,
      )
      .all() as TopClubEntry[];

    // Rankings: top clubs by attendance
    const topByAttendance = db
      .prepare(
        `SELECT e.club_id, c.name AS club_name, COUNT(a.id) AS value
         FROM attendance a
         JOIN events e ON e.id = a.event_id
         JOIN clubs c ON c.id = e.club_id
         WHERE e.status = 'published' AND e.starts_at >= date('now', '-6 months')
         GROUP BY e.club_id ORDER BY value DESC LIMIT 5`,
      )
      .all() as TopClubEntry[];

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

  computeKpi(semesterId: number): number {
    const semester = db.prepare('SELECT * FROM semesters WHERE id = ?').get(semesterId) as
      | { id: number; name: string; starts_at: string; ends_at: string }
      | undefined;
    if (!semester) throw new Error(`Semester ${semesterId} not found`);

    const { starts_at, ends_at } = semester;

    const computedKeys = ['attendance_count', 'member_count'];

    db.transaction(() => {
      // Delete old computed rows for this semester
      db.prepare(
        `DELETE FROM kpi_metrics WHERE semester_id = ? AND metric_key IN (${computedKeys.map(() => '?').join(',')})`,
      ).run(semesterId, ...computedKeys);

      // Attendance count per club
      const attendances = db.prepare(`
        SELECT e.club_id, COUNT(a.id) AS cnt
        FROM attendance a
        JOIN events e ON e.id = a.event_id
        WHERE e.status = 'published'
          AND a.checked_in_at BETWEEN ? AND ?
        GROUP BY e.club_id
      `).all(starts_at, ends_at) as { club_id: number; cnt: number }[];

      for (const row of attendances) {
        db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
          .run(row.club_id, semesterId, 'attendance_count', row.cnt);
      }

      // Active member count per club
      const members = db.prepare(`
        SELECT club_id, COUNT(*) AS cnt
        FROM memberships WHERE status = 'active'
        GROUP BY club_id
      `).all() as { club_id: number; cnt: number }[];

      for (const row of members) {
        db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
          .run(row.club_id, semesterId, 'member_count', row.cnt);
      }
    })();

    return (db.prepare(`
      SELECT COUNT(DISTINCT club_id) AS n
      FROM kpi_metrics
      WHERE semester_id = ? AND metric_key = 'attendance_count'
    `).get(semesterId) as any).n as number;
  },
};
