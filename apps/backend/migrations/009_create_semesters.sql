CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_semesters_is_active ON semesters(is_active);
