-- Achievement definitions catalog (rules that can be auto-awarded)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  entity_type TEXT    NOT NULL CHECK(entity_type IN ('student', 'club')),
  title       TEXT    NOT NULL,
  title_ar    TEXT    NOT NULL,
  description TEXT    NOT NULL,
  description_ar TEXT NOT NULL,
  tier        TEXT    NOT NULL CHECK(tier IN ('Bronze', 'Silver', 'Gold')),
  points      INTEGER NOT NULL DEFAULT 0,
  metric      TEXT    NOT NULL,   -- field name in the metrics object
  threshold   INTEGER NOT NULL,   -- metric must be >= threshold to unlock
  is_active   INTEGER NOT NULL DEFAULT 1
);

-- Records of which entities have unlocked which definitions
CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  definition_id INTEGER NOT NULL REFERENCES achievement_definitions(id),
  entity_type   TEXT    NOT NULL CHECK(entity_type IN ('student', 'club')),
  entity_id     INTEGER NOT NULL,   -- user_id or club_id
  unlocked_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(definition_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_entity
  ON achievement_unlocks(entity_type, entity_id);

-- ─── Student achievement rules ────────────────────────────────────────────────
INSERT OR IGNORE INTO achievement_definitions
  (code, entity_type, title, title_ar, description, description_ar, tier, points, metric, threshold)
VALUES
  ('attend_1',  'student', 'First Steps',       'الخطوات الأولى',
   'Attend your first event',    'احضر أول فعالية لك',        'Bronze', 5,  'attendance_count', 1),
  ('attend_5',  'student', 'Regular Attendee',  'الحضور المنتظم',
   'Attend 5 events',            'احضر 5 فعاليات',            'Bronze', 10, 'attendance_count', 5),
  ('attend_10', 'student', 'Dedicated Member',  'العضو المتفاني',
   'Attend 10 events',           'احضر 10 فعاليات',           'Silver', 20, 'attendance_count', 10),
  ('attend_25', 'student', 'Event Champion',    'بطل الفعاليات',
   'Attend 25 events',           'احضر 25 فعالية',            'Gold',   50, 'attendance_count', 25),
  ('streak_3',  'student', 'Getting Started',   'بداية قوية',
   'Log in 3 days in a row',     'سجّل دخولك 3 أيام متتالية', 'Bronze', 5,  'login_streak', 3),
  ('streak_7',  'student', 'Weekly Warrior',    'محارب الأسبوع',
   'Log in 7 days in a row',     'سجّل دخولك 7 أيام متتالية', 'Silver', 15, 'login_streak', 7),
  ('streak_30', 'student', 'Dedicated User',    'المستخدم المتفاني',
   'Log in 30 days in a row',    'سجّل دخولك 30 يوماً متتالياً', 'Gold', 30, 'login_streak', 30);

-- ─── Club achievement rules ───────────────────────────────────────────────────
INSERT OR IGNORE INTO achievement_definitions
  (code, entity_type, title, title_ar, description, description_ar, tier, points, metric, threshold)
VALUES
  ('host_1',             'club', 'First Event',       'الفعالية الأولى',
   'Host your first published event',          'استضف أول فعالية منشورة',              'Bronze', 10, 'published_event_count', 1),
  ('host_10',            'club', 'Active Organizer',  'المنظم النشط',
   'Host 10 published events',                 'استضف 10 فعاليات منشورة',              'Silver', 30, 'published_event_count', 10),
  ('members_10',         'club', 'Growing Club',      'النادي المتنامي',
   'Reach 10 active members',                  'الوصول إلى 10 أعضاء نشطين',            'Bronze', 15, 'active_member_count', 10),
  ('members_20',         'club', 'Growing Community', 'المجتمع المتنامي',
   'Reach 20 active members',                  'الوصول إلى 20 عضواً نشطاً',            'Silver', 15, 'active_member_count', 20),
  ('attend_50',          'club', 'Popular Events',    'الفعاليات الشعبية',
   'Accumulate 50 total attendances',          'تراكم 50 حضوراً إجمالياً',              'Silver', 25, 'verified_attendance_total', 50),
  ('attend_100',         'club', 'High Engagement',   'التفاعل العالي',
   'Accumulate 100 total attendances',         'تراكم 100 حضور إجمالي',                'Gold',   30, 'verified_attendance_total', 100),
  ('participants_50',    'club', 'Popular Club',      'النادي الشعبي',
   'Reach 50 participants in a single event',  'الوصول إلى 50 مشاركاً في فعالية واحدة', 'Gold',  20, 'max_single_event_participants', 50);
