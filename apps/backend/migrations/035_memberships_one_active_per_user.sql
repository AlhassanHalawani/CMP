CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_active_per_user
  ON memberships(user_id)
  WHERE status = 'active';
