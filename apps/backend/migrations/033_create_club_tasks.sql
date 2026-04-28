CREATE TABLE club_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id      INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id     INTEGER REFERENCES events(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done','cancelled')),
  priority     TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
  due_at       TEXT,
  created_by   INTEGER NOT NULL REFERENCES users(id),
  assigned_to  INTEGER REFERENCES users(id),
  role_key     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_club_tasks_club        ON club_tasks(club_id);
CREATE INDEX idx_club_tasks_assigned_to ON club_tasks(assigned_to);
CREATE INDEX idx_club_tasks_event       ON club_tasks(event_id);
CREATE INDEX idx_club_tasks_status      ON club_tasks(status);
