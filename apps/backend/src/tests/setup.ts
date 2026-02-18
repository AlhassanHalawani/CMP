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
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status) VALUES (1, 'Test Event', 'فعالية اختبار', '2026-06-01 10:00:00', '2026-06-01 12:00:00', 'published');
    INSERT INTO events (club_id, title, title_ar, starts_at, ends_at, status) VALUES (1, 'Draft Event', 'فعالية مسودة', '2026-07-01 10:00:00', '2026-07-01 12:00:00', 'draft');
    INSERT INTO registrations (event_id, user_id, status) VALUES (1, 1, 'confirmed');
  `);
}

export { TEST_JWT_SECRET };
