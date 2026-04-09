CREATE TABLE IF NOT EXISTS user_ui_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT,
  color_preset TEXT NOT NULL DEFAULT 'indigo',
  radius_base TEXT NOT NULL DEFAULT '0px',
  box_shadow_x TEXT NOT NULL DEFAULT '4px',
  box_shadow_y TEXT NOT NULL DEFAULT '4px',
  font_weight_heading TEXT NOT NULL DEFAULT '700',
  font_weight_base TEXT NOT NULL DEFAULT '500',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
