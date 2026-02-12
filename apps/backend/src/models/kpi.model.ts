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
  total_score: number;
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

  getLeaderboard(semesterId?: number): LeaderboardEntry[] {
    let sql = `
      SELECT km.club_id, c.name as club_name, SUM(km.metric_value) as total_score
      FROM kpi_metrics km
      JOIN clubs c ON c.id = km.club_id
    `;
    const values: any[] = [];
    if (semesterId) {
      sql += ' WHERE km.semester_id = ?';
      values.push(semesterId);
    }
    sql += ' GROUP BY km.club_id ORDER BY total_score DESC';
    return db.prepare(sql).all(...values) as LeaderboardEntry[];
  },
};
