CREATE TABLE IF NOT EXISTS kpi_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  semester_id INTEGER,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_club_id ON kpi_metrics(club_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_semester_id ON kpi_metrics(semester_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_key ON kpi_metrics(metric_key);
