ALTER TABLE events ADD COLUMN category TEXT;
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
