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
    getLeaderboard(semesterId) {
        let sql = `
      SELECT km.club_id, c.name as club_name, SUM(km.metric_value) as total_score
      FROM kpi_metrics km
      JOIN clubs c ON c.id = km.club_id
    `;
        const values = [];
        if (semesterId) {
            sql += ' WHERE km.semester_id = ?';
            values.push(semesterId);
        }
        sql += ' GROUP BY km.club_id ORDER BY total_score DESC';
        return database_1.db.prepare(sql).all(...values);
    },
};
//# sourceMappingURL=kpi.model.js.map