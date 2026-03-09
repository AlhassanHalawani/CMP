CREATE TABLE memberships (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id      INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','inactive')),
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_memberships_club   ON memberships(club_id);
CREATE INDEX idx_memberships_user   ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
