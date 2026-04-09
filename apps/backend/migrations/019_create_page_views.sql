CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
