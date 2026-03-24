ALTER TABLE clubs ADD COLUMN department TEXT;
CREATE INDEX IF NOT EXISTS idx_clubs_department ON clubs(department);
