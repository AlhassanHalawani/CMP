CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  method TEXT NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
  qr_token TEXT,
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
