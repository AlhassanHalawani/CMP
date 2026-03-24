CREATE TABLE IF NOT EXISTS leader_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id     INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message     TEXT,
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  -- Only one active (pending) request per user per club at a time
  UNIQUE (user_id, club_id, status) ON CONFLICT IGNORE
);
