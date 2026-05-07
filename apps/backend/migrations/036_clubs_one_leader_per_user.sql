CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_one_leader_per_user
  ON clubs(leader_id)
  WHERE leader_id IS NOT NULL;
