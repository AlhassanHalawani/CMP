import { db } from '../config/database';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface ClubTask {
  id: number;
  club_id: number;
  event_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  created_by: number;
  assigned_to: number | null;
  role_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ClubTaskWithDetails extends ClubTask {
  assignee_name: string | null;
  assignee_email: string | null;
  assignee_avatar: string | null;
  event_title: string | null;
}

export interface CreateTaskPayload {
  club_id: number;
  event_id?: number | null;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  due_at?: string | null;
  created_by: number;
  assigned_to?: number | null;
  role_key?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  assigned_to?: number | null;
  role_key?: string | null;
  event_id?: number | null;
}

export const ClubTaskModel = {
  findById(id: number): ClubTaskWithDetails | undefined {
    return db
      .prepare(
        `SELECT t.*,
                u.name AS assignee_name, u.email AS assignee_email, u.avatar_url AS assignee_avatar,
                e.title AS event_title
         FROM club_tasks t
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN events e ON e.id = t.event_id
         WHERE t.id = ?`
      )
      .get(id) as ClubTaskWithDetails | undefined;
  },

  listByClub(
    clubId: number,
    filters: { status?: string; assigned_to?: number; role_key?: string; event_id?: number } = {}
  ): ClubTaskWithDetails[] {
    let sql = `SELECT t.*,
                      u.name AS assignee_name, u.email AS assignee_email, u.avatar_url AS assignee_avatar,
                      e.title AS event_title
               FROM club_tasks t
               LEFT JOIN users u ON u.id = t.assigned_to
               LEFT JOIN events e ON e.id = t.event_id
               WHERE t.club_id = ?`;
    const params: (string | number)[] = [clubId];

    if (filters.status) { sql += ' AND t.status = ?'; params.push(filters.status); }
    if (filters.assigned_to) { sql += ' AND t.assigned_to = ?'; params.push(filters.assigned_to); }
    if (filters.role_key) { sql += ' AND t.role_key = ?'; params.push(filters.role_key); }
    if (filters.event_id) { sql += ' AND t.event_id = ?'; params.push(filters.event_id); }

    sql += ' ORDER BY t.created_at DESC';
    return db.prepare(sql).all(...params) as ClubTaskWithDetails[];
  },

  listByAssignee(userId: number): ClubTaskWithDetails[] {
    return db
      .prepare(
        `SELECT t.*,
                u.name AS assignee_name, u.email AS assignee_email, u.avatar_url AS assignee_avatar,
                e.title AS event_title
         FROM club_tasks t
         LEFT JOIN users u ON u.id = t.assigned_to
         LEFT JOIN events e ON e.id = t.event_id
         WHERE t.assigned_to = ? AND t.status NOT IN ('cancelled')
         ORDER BY t.due_at ASC, t.created_at DESC`
      )
      .all(userId) as ClubTaskWithDetails[];
  },

  create(payload: CreateTaskPayload): ClubTaskWithDetails {
    const result = db
      .prepare(
        `INSERT INTO club_tasks (club_id, event_id, title, description, priority, due_at, created_by, assigned_to, role_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        payload.club_id,
        payload.event_id ?? null,
        payload.title,
        payload.description ?? null,
        payload.priority ?? 'normal',
        payload.due_at ?? null,
        payload.created_by,
        payload.assigned_to ?? null,
        payload.role_key ?? null
      );
    return ClubTaskModel.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, payload: UpdateTaskPayload): ClubTaskWithDetails {
    const task = db.prepare('SELECT * FROM club_tasks WHERE id = ?').get(id) as ClubTask;

    const isDone = payload.status === 'done';
    const wasNotDone = task.status !== 'done';
    const isReopened = task.status === 'done' && payload.status && payload.status !== 'done';

    db.prepare(
      `UPDATE club_tasks SET
         title        = COALESCE(?, title),
         description  = COALESCE(?, description),
         status       = COALESCE(?, status),
         priority     = COALESCE(?, priority),
         due_at       = COALESCE(?, due_at),
         assigned_to  = COALESCE(?, assigned_to),
         role_key     = COALESCE(?, role_key),
         event_id     = COALESCE(?, event_id),
         completed_at = CASE
           WHEN ? = 'done' AND ? != 'done' THEN datetime('now')
           WHEN ? != 'done' AND ? = 'done' THEN NULL
           ELSE completed_at
         END,
         updated_at   = datetime('now')
       WHERE id = ?`
    ).run(
      payload.title ?? null,
      payload.description ?? null,
      payload.status ?? null,
      payload.priority ?? null,
      payload.due_at ?? null,
      payload.assigned_to ?? null,
      payload.role_key ?? null,
      payload.event_id ?? null,
      payload.status ?? task.status, wasNotDone ? 'todo' : task.status,
      payload.status ?? task.status, task.status,
      id
    );

    // Handle explicit null assignments in update (COALESCE can't set to null)
    if ('assigned_to' in payload && payload.assigned_to === null) {
      db.prepare("UPDATE club_tasks SET assigned_to = NULL WHERE id = ?").run(id);
    }
    if ('event_id' in payload && payload.event_id === null) {
      db.prepare("UPDATE club_tasks SET event_id = NULL WHERE id = ?").run(id);
    }
    if ('description' in payload && payload.description === null) {
      db.prepare("UPDATE club_tasks SET description = NULL WHERE id = ?").run(id);
    }
    if ('role_key' in payload && payload.role_key === null) {
      db.prepare("UPDATE club_tasks SET role_key = NULL WHERE id = ?").run(id);
    }

    // Handle completed_at for done/reopen
    if (isDone && wasNotDone) {
      db.prepare("UPDATE club_tasks SET completed_at = datetime('now') WHERE id = ?").run(id);
    } else if (isReopened) {
      db.prepare("UPDATE club_tasks SET completed_at = NULL WHERE id = ?").run(id);
    }

    return ClubTaskModel.findById(id)!;
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM club_tasks WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
