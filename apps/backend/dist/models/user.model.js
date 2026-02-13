"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = require("../config/database");
exports.UserModel = {
    findById(id) {
        return database_1.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },
    findByKeycloakId(keycloakId) {
        return database_1.db.prepare('SELECT * FROM users WHERE keycloak_id = ?').get(keycloakId);
    },
    findByEmail(email) {
        return database_1.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    },
    upsert(data) {
        const existing = exports.UserModel.findByKeycloakId(data.keycloak_id);
        if (existing) {
            database_1.db.prepare('UPDATE users SET email = ?, name = ? WHERE keycloak_id = ?').run(data.email, data.name, data.keycloak_id);
            return exports.UserModel.findByKeycloakId(data.keycloak_id);
        }
        const result = database_1.db
            .prepare('INSERT INTO users (keycloak_id, email, name, role) VALUES (?, ?, ?, ?)')
            .run(data.keycloak_id, data.email, data.name, data.role || 'student');
        return exports.UserModel.findById(result.lastInsertRowid);
    },
    updateRole(id, role) {
        database_1.db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    },
    updateProfile(id, data) {
        const fields = [];
        const values = [];
        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.avatar_url !== undefined) {
            fields.push('avatar_url = ?');
            values.push(data.avatar_url);
        }
        if (fields.length === 0)
            return;
        values.push(id);
        database_1.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    },
    list(params) {
        let sql = 'SELECT * FROM users';
        const values = [];
        if (params?.role) {
            sql += ' WHERE role = ?';
            values.push(params.role);
        }
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
    count() {
        return database_1.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    },
};
//# sourceMappingURL=user.model.js.map