import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-secret-min-32-chars-long-for-dev';

// Create in-memory database and run schema
export function createTestDb() {
  const testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keycloak_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'club_leader', 'admin')),
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      description TEXT,
      description_ar TEXT,
      logo_url TEXT,
      leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      description TEXT,
      description_ar TEXT,
      location TEXT,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      capacity INTEGER,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published', 'rejected', 'cancelled', 'completed')),
      rejection_notes TEXT,
      members_only INTEGER NOT NULL DEFAULT 0,
      delivery_mode TEXT NOT NULL DEFAULT 'physical' CHECK (delivery_mode IN ('physical', 'online')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      checkin_open INTEGER NOT NULL DEFAULT 0,
      checkin_finalized INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      twitter_url TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
      is_read INTEGER NOT NULL DEFAULT 0,
      target_url TEXT,
      actions_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app','email')),
      enabled INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, event_type, channel)
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
      registered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
      method TEXT NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
      qr_token TEXT,
      UNIQUE(event_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS kpi_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      semester_id INTEGER,
      metric_key TEXT NOT NULL,
      metric_value REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      title_ar TEXT NOT NULL,
      description TEXT,
      description_ar TEXT,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      semester_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','inactive')),
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(club_id, user_id)
    );
  `);

  return testDb;
}

// Generate a dev-mode JWT token for testing
export function generateTestToken(overrides: Record<string, any> = {}) {
  const payload = {
    sub: 'test-keycloak-id',
    email: 'test@stu.kau.edu.sa',
    name: 'Test User',
    preferred_username: 'testuser',
    dev: true,
    realm_access: { roles: ['student'] },
    ...overrides,
  };
  return jwt.sign(payload, TEST_JWT_SECRET);
}

export function generateAdminToken(overrides: Record<string, any> = {}) {
  return generateTestToken({
    sub: 'admin-keycloak-id',
    email: 'admin@kau.edu.sa',
    name: 'Admin User',
    realm_access: { roles: ['admin'] },
    ...overrides,
  });
}

export function generateLeaderToken(overrides: Record<string, any> = {}) {
  return generateTestToken({
    sub: 'leader-keycloak-id',
    email: 'leader@kau.edu.sa',
    name: 'Club Leader',
    realm_access: { roles: ['club_leader'] },
    ...overrides,
  });
}

/** Insert seed data for attendance tests: a user, club, published event, and registration */
export function seedAttendanceData(db: Database.Database) {
  db.exec(`
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('test-keycloak-id', 'test@stu.kau.edu.sa', 'Test User', 'student');
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('admin-keycloak-id', 'admin@kau.edu.sa', 'Admin User', 'admin');
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('leader-keycloak-id', 'leader@kau.edu.sa', 'Club Leader', 'club_leader');
    INSERT INTO clubs (name, name_ar, leader_id) VALUES ('Test Club', 'نادي اختبار', 3);
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status, checkin_open) VALUES (1, 'Test Event', 'فعالية اختبار', '2026-06-01 10:00:00', '2026-06-01 12:00:00', 'published', 1);
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status) VALUES (1, 'Draft Event', 'فعالية مسودة', '2026-07-01 10:00:00', '2026-07-01 12:00:00', 'draft');
    INSERT INTO registrations (event_id, user_id, status) VALUES (1, 1, 'confirmed');
  `);
}

/**
 * Seed data for ownership authorization tests.
 *
 * Users:
 *   id=1  student        keycloak: test-keycloak-id
 *   id=2  admin          keycloak: admin-keycloak-id
 *   id=3  club_leader    keycloak: leader-keycloak-id     (owns club 1)
 *   id=4  club_leader    keycloak: leader2-keycloak-id    (owns club 2)
 *
 * Clubs:
 *   id=1  leader_id=3  (owned by leader1)
 *   id=2  leader_id=4  (owned by leader2)
 *
 * Events:
 *   id=1  club_id=1  published  (owned by leader1 via club)
 *   id=2  club_id=1  draft      (owned by leader1 via club)
 *   id=3  club_id=2  published  (owned by leader2 via club)
 *
 * Registrations:
 *   user_id=1 registered for event 1
 *
 * KPI / Achievements:
 *   kpi_metrics: one record for club 1
 *   achievements: one record for club 1
 */
export function seedOwnershipData(db: Database.Database) {
  db.exec(`
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('test-keycloak-id', 'test@stu.kau.edu.sa', 'Test User', 'student');
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('admin-keycloak-id', 'admin@kau.edu.sa', 'Admin User', 'admin');
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('leader-keycloak-id', 'leader@kau.edu.sa', 'Club Leader 1', 'club_leader');
    INSERT INTO users (keycloak_id, email, name, role) VALUES ('leader2-keycloak-id', 'leader2@kau.edu.sa', 'Club Leader 2', 'club_leader');
    INSERT INTO clubs (name, name_ar, leader_id) VALUES ('Club One', 'نادي واحد', 3);
    INSERT INTO clubs (name, name_ar, leader_id) VALUES ('Club Two', 'نادي اثنين', 4);
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status, checkin_open) VALUES (1, 'Club1 Event', 'فعالية 1', '2026-06-01 10:00:00', '2026-06-01 12:00:00', 'published', 1);
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status) VALUES (1, 'Club1 Draft', 'مسودة 1', '2026-07-01 10:00:00', '2026-07-01 12:00:00', 'draft');
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status, checkin_open) VALUES (2, 'Club2 Event', 'فعالية 2', '2026-06-01 10:00:00', '2026-06-01 12:00:00', 'published', 1);
    INSERT INTO registrations (event_id, user_id, status) VALUES (1, 1, 'confirmed');
    INSERT INTO kpi_metrics (club_id, metric_key, metric_value) VALUES (1, 'events_held', 1);
    INSERT INTO achievements (user_id, club_id, title, title_ar) VALUES (1, 1, 'Test Award', 'جائزة');
  `);
}

/**
 * Generate a token for a second club leader (leader2) used in ownership tests.
 */
export function generateLeader2Token(overrides: Record<string, any> = {}) {
  return generateTestToken({
    sub: 'leader2-keycloak-id',
    email: 'leader2@kau.edu.sa',
    name: 'Club Leader 2',
    realm_access: { roles: ['club_leader'] },
    ...overrides,
  });
}

export { TEST_JWT_SECRET };
