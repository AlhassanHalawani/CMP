-- Tracks keycloak_ids of deleted users so the authenticate middleware
-- can reject valid JWTs that belong to accounts that have been removed.
CREATE TABLE IF NOT EXISTS _deleted_users (
  keycloak_id TEXT PRIMARY KEY NOT NULL,
  deleted_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
