-- Add XP summary fields to users
ALTER TABLE users ADD COLUMN xp_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN current_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN profile_completed_at TEXT NULL;

-- XP transaction ledger (source of truth + audit trail)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_key TEXT NOT NULL,
  xp_delta INTEGER NOT NULL,
  source_type TEXT NULL,
  source_id INTEGER NULL,
  reference_key TEXT NOT NULL UNIQUE,
  metadata_json TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reference_key ON xp_transactions(reference_key);
