ALTER TABLE users ADD COLUMN student_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id_unique
  ON users(student_id)
  WHERE student_id IS NOT NULL;
