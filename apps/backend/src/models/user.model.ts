import { db } from '../config/database';

export interface User {
  id: number;
  keycloak_id: string;
  email: string;
  name: string;
  role: 'student' | 'club_leader' | 'admin';
  avatar_url: string | null;
  created_at: string;
}

export const UserModel = {
  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  findByKeycloakId(keycloakId: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE keycloak_id = ?').get(keycloakId) as User | undefined;
  },

  findByEmail(email: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  },

  upsert(data: { keycloak_id: string; email: string; name: string; role?: string }): User {
    const existing = UserModel.findByKeycloakId(data.keycloak_id);
    if (existing) {
      db.prepare('UPDATE users SET email = ?, name = ? WHERE keycloak_id = ?').run(
        data.email,
        data.name,
        data.keycloak_id
      );
      return UserModel.findByKeycloakId(data.keycloak_id)!;
    }
    const result = db
      .prepare('INSERT INTO users (keycloak_id, email, name, role) VALUES (?, ?, ?, ?)')
      .run(data.keycloak_id, data.email, data.name, data.role || 'student');
    return UserModel.findById(result.lastInsertRowid as number)!;
  },

  updateRole(id: number, role: User['role']): void {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  },

  updateProfile(id: number, data: { name?: string; avatar_url?: string | null }): void {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  list(params?: { role?: string; limit?: number; offset?: number }): User[] {
    let sql = 'SELECT * FROM users';
    const values: any[] = [];
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
    return db.prepare(sql).all(...values) as User[];
  },

  count(): number {
    return (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  },
};
