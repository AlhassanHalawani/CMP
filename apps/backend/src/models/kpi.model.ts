import { db } from '../config/database';

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
  achievement_count: number;
  member_count: number;
  total_score: number;
  rank: number;
}

export const KpiModel = {
  recordMetric(data: { club_id: number; semester_id?: number; metric_key: string; metric_value: number }): KpiMetric {
    const result = db
      .prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
      .run(data.club_id, data.semester_id || null, data.metric_key, data.metric_value);
    return db.prepare('SELECT * FROM kpi_metrics WHERE id = ?').get(result.lastInsertRowid) as KpiMetric;
  },

  getClubSummary(clubId: number, semesterId?: number): ClubKpiSummary[] {
    let sql = 'SELECT club_id, metric_key, SUM(metric_value) as total FROM kpi_metrics WHERE club_id = ?';
    const values: any[] = [clubId];
    if (semesterId) {
      sql += ' AND semester_id = ?';
      values.push(semesterId);
    }
    sql += ' GROUP BY metric_key';
    return db.prepare(sql).all(...values) as ClubKpiSummary[];
  },

  getLeaderboard(semesterId?: number, department?: string): LeaderboardEntry[] {
    const conditions: string[] = [];
    const values: any[] = [];

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

    const rows = db.prepare(sql).all(...values) as Omit<LeaderboardEntry, 'rank'>[];

    // Apply tied-rank logic in application code
    let rank = 1;
    return rows.map((row, i) => {
      if (i > 0 && row.total_score < (rows[i - 1] as any).total_score) rank = i + 1;
      return { ...row, rank };
    });
  },

  computeKpi(semesterId: number): number {
    const semester = db.prepare('SELECT * FROM semesters WHERE id = ?').get(semesterId) as
      | { id: number; name: string; starts_at: string; ends_at: string }
      | undefined;
    if (!semester) throw new Error(`Semester ${semesterId} not found`);

    const { starts_at, ends_at } = semester;

    const computedKeys = ['attendance_count', 'achievement_count', 'member_count', 'total_score'];

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

      // Achievement count per club
      const achievements = db.prepare(`
        SELECT club_id, COUNT(id) AS cnt
        FROM achievements
        WHERE awarded_at BETWEEN ? AND ?
        GROUP BY club_id
      `).all(starts_at, ends_at) as { club_id: number; cnt: number }[];

      for (const row of achievements) {
        db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
          .run(row.club_id, semesterId, 'achievement_count', row.cnt);
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
        db.prepare('INSERT INTO kpi_metrics (club_id, semester_id, metric_key, metric_value) VALUES (?, ?, ?, ?)')
          .run(clubId, semesterId, 'total_score', total);
      }
    })();

    return (db.prepare(`
      SELECT COUNT(DISTINCT club_id) AS n
      FROM kpi_metrics
      WHERE semester_id = ? AND metric_key = 'total_score'
    `).get(semesterId) as any).n as number;
  },
};
