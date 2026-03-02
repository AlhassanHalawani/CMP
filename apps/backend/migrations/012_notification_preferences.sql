CREATE TABLE notification_preferences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel    TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app','email')),
  enabled    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, event_type, channel)
);

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);
