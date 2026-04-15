-- Tracks daily logins for login-streak achievement computation
CREATE TABLE IF NOT EXISTS user_login_activity (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_date  TEXT    NOT NULL,   -- YYYY-MM-DD
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_user_login_activity_user_date
  ON user_login_activity(user_id, login_date DESC);
