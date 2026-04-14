import { db } from '../config/database';

export interface PageView {
  id: number;
  session_id: string;
  user_id: number | null;
  path: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  referrer: string | null;
  created_at: string;
}

export interface TrafficSeries {
  date: string;
  desktop: number;
  mobile: number;
}

export interface TrafficData {
  range: string;
  totals: { visitors: number; page_views: number };
  series: TrafficSeries[];
}

export const PageViewModel = {
  create(data: { session_id: string; user_id?: number | null; path: string; device_type: string; referrer?: string | null }): PageView {
    const stmt = db.prepare(`
      INSERT INTO page_views (session_id, user_id, path, device_type, referrer)
      VALUES (@session_id, @user_id, @path, @device_type, @referrer)
    `);
    const result = stmt.run({
      session_id: data.session_id,
      user_id: data.user_id ?? null,
      path: data.path,
      device_type: data.device_type,
      referrer: data.referrer ?? null,
    });
    return db.prepare('SELECT * FROM page_views WHERE id = ?').get(result.lastInsertRowid) as PageView;
  },

  getTraffic(range: '7d' | '30d' | '90d'): TrafficData {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;

    const totalsRow = db.prepare(`
      SELECT
        COUNT(DISTINCT session_id) AS visitors,
        COUNT(*) AS page_views
      FROM page_views
      WHERE created_at >= datetime('now', ?)
    `).get(`-${days} days`) as { visitors: number; page_views: number };

    const seriesRows = db.prepare(`
      SELECT
        date(created_at) AS date,
        SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) AS desktop,
        SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobile
      FROM page_views
      WHERE created_at >= datetime('now', ?)
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(`-${days} days`) as TrafficSeries[];

    // Build a complete daily series — zero-fill missing dates
    const rowMap = new Map(seriesRows.map((r) => [r.date, r]));
    const fullSeries: TrafficSeries[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      fullSeries.push(rowMap.get(dateStr) ?? { date: dateStr, desktop: 0, mobile: 0 });
    }

    return {
      range,
      totals: totalsRow ?? { visitors: 0, page_views: 0 },
      series: fullSeries,
    };
  },
};
