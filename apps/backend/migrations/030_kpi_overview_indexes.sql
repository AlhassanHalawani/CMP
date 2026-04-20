-- Performance indexes for rolling 6-month KPI overview queries
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_status_starts_at ON events (status, starts_at);
