"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogModel = void 0;
const database_1 = require("../config/database");
exports.AuditLogModel = {
    log(data) {
        database_1.db.prepare('INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, payload) VALUES (?, ?, ?, ?, ?)').run(data.actor_id, data.action, data.entity_type, data.entity_id || null, data.payload ? JSON.stringify(data.payload) : null);
    },
    list(params) {
        let sql = 'SELECT * FROM audit_logs';
        const conditions = [];
        const values = [];
        if (params?.entity_type) {
            conditions.push('entity_type = ?');
            values.push(params.entity_type);
        }
        if (conditions.length)
            sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY created_at DESC';
        if (params?.limit) {
            sql += ' LIMIT ?';
            values.push(params.limit);
        }
        if (params?.offset) {
            sql += ' OFFSET ?';
            values.push(params.offset);
        }
        return database_1.db.prepare(sql).all(...values);
    },
};
//# sourceMappingURL=auditLog.model.js.map