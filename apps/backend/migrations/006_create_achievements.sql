CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
  semester_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_club_id ON achievements(club_id);
CREATE INDEX IF NOT EXISTS idx_achievements_semester_id ON achievements(semester_id);
