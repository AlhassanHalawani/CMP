CREATE TABLE daily_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  explanation TEXT NULL,
  active_date TEXT NOT NULL,
  participation_xp INTEGER NOT NULL DEFAULT 5,
  correct_bonus_xp INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL,
  published_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE daily_question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  option_key TEXT NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES daily_questions(id) ON DELETE CASCADE,
  UNIQUE(question_id, option_key)
);

CREATE TABLE daily_question_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  selected_option_id INTEGER NOT NULL,
  is_correct INTEGER NOT NULL,
  participation_xp_awarded INTEGER NOT NULL DEFAULT 0,
  correct_bonus_xp_awarded INTEGER NOT NULL DEFAULT 0,
  answered_on TEXT NOT NULL,
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_id) REFERENCES daily_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES daily_question_options(id) ON DELETE CASCADE,
  UNIQUE(question_id, user_id)
);

CREATE TABLE daily_question_streaks (
  user_id INTEGER PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_answered_on TEXT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
