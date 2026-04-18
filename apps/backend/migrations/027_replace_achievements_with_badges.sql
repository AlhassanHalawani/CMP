-- FR-014: Replace achievements with a badge system
-- Creates badge_definitions, badge_unlocks, and adds featured_badge_definition_id to users.
-- Legacy achievement tables are preserved for compatibility.

-- ─── Badge definitions catalog ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badge_definitions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  entity_type TEXT    NOT NULL DEFAULT 'student',
  name        TEXT    NOT NULL,
  name_ar     TEXT    NOT NULL,
  description TEXT    NOT NULL,
  description_ar TEXT NOT NULL,
  icon_key    TEXT    NOT NULL,
  rarity      TEXT    NOT NULL DEFAULT 'common' CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')),
  metric_key  TEXT    NOT NULL,
  threshold   INTEGER NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ─── Badge unlock records ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badge_unlocks (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_definition_id  INTEGER NOT NULL,
  user_id              INTEGER NOT NULL,
  unlocked_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  source_type          TEXT    NULL,
  source_id            INTEGER NULL,
  FOREIGN KEY (badge_definition_id) REFERENCES badge_definitions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(badge_definition_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_badge_unlocks_user
  ON badge_unlocks(user_id);

-- ─── Featured badge on users table ────────────────────────────────────────────
ALTER TABLE users ADD COLUMN featured_badge_definition_id INTEGER NULL
  REFERENCES badge_definitions(id) ON DELETE SET NULL;

-- ─── Seed V1 badge catalog ─────────────────────────────────────────────────────
INSERT OR IGNORE INTO badge_definitions
  (code, entity_type, name, name_ar, description, description_ar, icon_key, rarity, metric_key, threshold, sort_order)
VALUES
  ('club_join_1',     'student',
   'First Step',       'الخطوة الأولى',
   'Join your first club',               'انضم إلى أول نادٍ',
   'door-open',  'common',    'joined_clubs_count',               1,  10),

  ('club_explorer_5', 'student',
   'Explorer',         'المستكشف',
   'Visit 5 distinct club pages',        'زر 5 صفحات أندية مختلفة',
   'compass',    'common',    'distinct_club_pages_visited',      5,  20),

  ('attendance_3',    'student',
   'Active Participant', 'المشارك النشط',
   'Attend 3 events',                    'احضر 3 فعاليات',
   'calendar-check', 'common',  'attendance_count',               3,  30),

  ('attendance_10',   'student',
   'Event Regular',    'الحضور الدائم',
   'Attend 10 events',                   'احضر 10 فعاليات',
   'calendar-check', 'rare',    'attendance_count',               10, 40),

  ('quiz_correct_10', 'student',
   'Quiz Master',      'سيد المسابقات',
   'Answer 10 daily questions correctly', 'أجب على 10 أسئلة يومية بشكل صحيح',
   'brain',      'rare',      'daily_questions_correct_count',   10, 50),

  ('quiz_correct_50', 'student',
   'Knowledge Champion', 'بطل المعرفة',
   'Answer 50 daily questions correctly', 'أجب على 50 سؤالاً يومياً بشكل صحيح',
   'brain',      'epic',      'daily_questions_correct_count',   50, 60);
