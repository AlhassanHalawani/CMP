"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageViewModel = void 0;
const database_1 = require("../config/database");
exports.PageViewModel = {
    create(data) {
        const stmt = database_1.db.prepare(`
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
        return database_1.db.prepare('SELECT * FROM page_views WHERE id = ?').get(result.lastInsertRowid);
    },
    getTraffic(range) {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const totalsRow = database_1.db.prepare(`
      SELECT
        COUNT(DISTINCT session_id) AS visitors,
        COUNT(*) AS page_views
      FROM page_views
      WHERE created_at >= datetime('now', ?)
    `).get(`-${days} days`);
        const seriesRows = database_1.db.prepare(`
      SELECT
        date(created_at) AS date,
        SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) AS desktop,
        SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobile
      FROM page_views
      WHERE created_at >= datetime('now', ?)
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(`-${days} days`);
        // Build a complete daily series — zero-fill missing dates
        const rowMap = new Map(seriesRows.map((r) => [r.date, r]));
        const fullSeries = [];
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
//# sourceMappingURL=pageView.model.js.map