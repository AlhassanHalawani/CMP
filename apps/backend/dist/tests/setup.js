"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_JWT_SECRET = void 0;
exports.createTestDb = createTestDb;
exports.generateTestToken = generateTestToken;
exports.generateAdminToken = generateAdminToken;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const TEST_JWT_SECRET = 'test-secret-min-32-chars-long-for-dev';
exports.TEST_JWT_SECRET = TEST_JWT_SECRET;
// Create in-memory database and run schema
function createTestDb() {
    const testDb = new better_sqlite3_1.default(':memory:');
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
function generateTestToken(overrides = {}) {
    const payload = {
        sub: 'test-keycloak-id',
        email: 'test@stu.kau.edu.sa',
        name: 'Test User',
        preferred_username: 'testuser',
        dev: true,
        realm_access: { roles: ['student'] },
        ...overrides,
    };
    return jsonwebtoken_1.default.sign(payload, TEST_JWT_SECRET);
}
function generateAdminToken(overrides = {}) {
    return generateTestToken({
        sub: 'admin-keycloak-id',
        email: 'admin@kau.edu.sa',
        name: 'Admin User',
        realm_access: { roles: ['admin'] },
        ...overrides,
    });
}
//# sourceMappingURL=setup.js.map