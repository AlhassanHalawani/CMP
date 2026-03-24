import { db } from '../config/database';

export interface LeaderRequest {
  id: number;
  user_id: number;
  club_id: number;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  admin_notes: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface LeaderRequestWithDetails extends LeaderRequest {
  user_name: string;
  user_email: string;
  club_name: string;
}

export const LeaderRequestModel = {
  findById(id: number): LeaderRequest | undefined {
    return db.prepare('SELECT * FROM leader_requests WHERE id = ?').get(id) as LeaderRequest | undefined;
  },

  findPendingByUserAndClub(userId: number, clubId: number): LeaderRequest | undefined {
    return db
      .prepare("SELECT * FROM leader_requests WHERE user_id = ? AND club_id = ? AND status = 'pending'")
      .get(userId, clubId) as LeaderRequest | undefined;
  },

  listAll(params?: { status?: string; limit?: number; offset?: number }): LeaderRequestWithDetails[] {
    let sql = `
      SELECT lr.*,
             u.name AS user_name,
             u.email AS user_email,
             c.name AS club_name
      FROM leader_requests lr
      JOIN users u ON u.id = lr.user_id
      JOIN clubs c ON c.id = lr.club_id
    `;
    const values: any[] = [];
    if (params?.status) {
      sql += ' WHERE lr.status = ?';
      values.push(params.status);
    }
    sql += ' ORDER BY lr.created_at DESC';
    if (params?.limit) { sql += ' LIMIT ?'; values.push(params.limit); }
    if (params?.offset) { sql += ' OFFSET ?'; values.push(params.offset); }
    return db.prepare(sql).all(...values) as LeaderRequestWithDetails[];
  },

  listByUser(userId: number): LeaderRequestWithDetails[] {
    return db.prepare(`
      SELECT lr.*,
             u.name AS user_name,
             u.email AS user_email,
             c.name AS club_name
      FROM leader_requests lr
      JOIN users u ON u.id = lr.user_id
      JOIN clubs c ON c.id = lr.club_id
      WHERE lr.user_id = ?
      ORDER BY lr.created_at DESC
    `).all(userId) as LeaderRequestWithDetails[];
  },

  create(data: { user_id: number; club_id: number; message?: string }): LeaderRequest {
    const result = db
      .prepare('INSERT INTO leader_requests (user_id, club_id, message) VALUES (?, ?, ?)')
      .run(data.user_id, data.club_id, data.message ?? null);
    return LeaderRequestModel.findById(result.lastInsertRowid as number)!;
  },

  updateStatus(
    id: number,
    status: 'approved' | 'rejected',
    reviewedBy: number,
    adminNotes?: string
  ): LeaderRequest | undefined {
    db.prepare(`
      UPDATE leader_requests
      SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), admin_notes = ?
      WHERE id = ?
    `).run(status, reviewedBy, adminNotes ?? null, id);
    return LeaderRequestModel.findById(id);
  },

  countPending(): number {
    return (db.prepare("SELECT COUNT(*) as cnt FROM leader_requests WHERE status = 'pending'").get() as any).cnt;
  },
};
