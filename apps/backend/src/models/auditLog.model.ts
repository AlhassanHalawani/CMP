import { db } from '../config/database';

export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  payload: string | null;
  created_at: string;
}

export const AuditLogModel = {
  log(data: {
    actor_id: number | null;
    action: string;
    entity_type: string;
    entity_id?: number;
    payload?: Record<string, any>;
  }): void {
    db.prepare(
      'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).run(
      data.actor_id,
      data.action,
      data.entity_type,
      data.entity_id || null,
      data.payload ? JSON.stringify(data.payload) : null
    );
  },

  list(params?: { limit?: number; offset?: number; entity_type?: string }): AuditLog[] {
    let sql = 'SELECT * FROM audit_logs';
    const conditions: string[] = [];
    const values: any[] = [];

    if (params?.entity_type) {
      conditions.push('entity_type = ?');
      values.push(params.entity_type);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    if (params?.limit) {
      sql += ' LIMIT ?';
      values.push(params.limit);
    }
    if (params?.offset) {
      sql += ' OFFSET ?';
      values.push(params.offset);
    }
    return db.prepare(sql).all(...values) as AuditLog[];
  },
};
