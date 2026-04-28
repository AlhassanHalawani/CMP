CREATE TABLE club_followers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id    INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  muted_at   TEXT,
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_followers_club ON club_followers(club_id);
CREATE INDEX idx_club_followers_user ON club_followers(user_id);
